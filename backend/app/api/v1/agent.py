"""Agent API – SSE streaming and synchronous chat endpoints."""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.core.responses import ok
from app.services import agent_orchestrator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agent", tags=["Agent"])


@router.post("/chat-sync", summary="Agent 对话（同步）")
def agent_chat_sync(body: dict[str, Any]):
    """Synchronous agent chat – waits for full result before responding."""
    user_message = body.get("message", "")
    if not user_message.strip():
        return ok({"content": "请输入消息", "steps": [], "actions": []})

    # Debug: log received parameters
    import logging
    _logger = logging.getLogger(__name__)
    _logger.warning(
        "Agent chat-sync: projectId=%s, topologyId=%s, msg=%s",
        body.get("projectId"), body.get("topologyId"), user_message[:50],
    )

    steps_collector: list[dict[str, Any]] = []

    def on_step(step: dict[str, Any]) -> None:
        steps_collector.append(step)

    result = agent_orchestrator.run_agent_chat(
        user_message,
        topology_id=body.get("topologyId"),
        project_id=body.get("projectId"),
        conversation_history=body.get("conversationHistory"),
        on_step=on_step,
    )

    return ok({
        "content": result["content"],
        "steps": steps_collector,
        "actions": result.get("actions", []),
    })


@router.post("/chat", summary="Agent 对话（SSE 流式）")
async def agent_chat(body: dict[str, Any]):
    """SSE streaming agent chat."""
    user_message = body.get("message", "")
    if not user_message.strip():
        async def _empty():
            yield f"event: message\ndata: {json.dumps({'content': '请输入消息', 'actions': []}, ensure_ascii=False)}\n\n"
            yield "event: done\ndata: {}\n\n"
        return StreamingResponse(_empty(), media_type="text/event-stream")

    topology_id = body.get("topologyId")
    project_id = body.get("projectId")
    conversation_history = body.get("conversationHistory")

    # Debug: log what frontend sends
    import logging as _log
    _log.getLogger(__name__).warning(
        "Agent SSE chat: projectId=%s, topologyId=%s, msg=%s",
        project_id, topology_id, user_message[:80],
    )

    async def event_generator():
        queue: asyncio.Queue[dict[str, Any] | None] = asyncio.Queue()

        def on_step(step: dict[str, Any]) -> None:
            try:
                loop = asyncio.get_running_loop()
                loop.call_soon_threadsafe(queue.put_nowait, step)
            except RuntimeError:
                # No running loop, try synchronous put
                queue.put_nowait(step)

        def _run():
            try:
                result = agent_orchestrator.run_agent_chat(
                    user_message,
                    topology_id=topology_id,
                    project_id=project_id,
                    conversation_history=conversation_history,
                    on_step=on_step,
                )
                # Signal final result
                try:
                    loop = asyncio.get_running_loop()
                    loop.call_soon_threadsafe(queue.put_nowait, {"__final__": result})
                except RuntimeError:
                    queue.put_nowait({"__final__": result})
            except Exception as exc:
                logger.exception("Agent orchestrator failed")
                try:
                    loop = asyncio.get_running_loop()
                    loop.call_soon_threadsafe(queue.put_nowait, {
                        "__final__": {
                            "content": f"Agent 执行失败: {exc}",
                            "steps": [],
                            "actions": [],
                        },
                    })
                except RuntimeError:
                    queue.put_nowait({"__final__": {
                        "content": f"Agent 执行失败: {exc}",
                        "steps": [],
                        "actions": [],
                    }})

        # Run orchestrator in thread pool to avoid blocking the event loop
        import concurrent.futures
        pool = concurrent.futures.ThreadPoolExecutor(max_workers=1)
        future = pool.submit(_run)

        try:
            while True:
                try:
                    item = await asyncio.wait_for(queue.get(), timeout=120)
                except asyncio.TimeoutError:
                    yield f"event: message\ndata: {json.dumps({'content': 'Agent 响应超时', 'actions': []}, ensure_ascii=False)}\n\n"
                    yield "event: done\ndata: {}\n\n"
                    break

                if item is None:
                    break

                if "__final__" in item:
                    final = item["__final__"]
                    yield f"event: message\ndata: {json.dumps({'content': final['content'], 'actions': final.get('actions', [])}, ensure_ascii=False)}\n\n"
                    yield "event: done\ndata: {}\n\n"
                    break
                else:
                    yield f"event: step\ndata: {json.dumps(item, ensure_ascii=False, default=str)}\n\n"
        finally:
            pool.shutdown(wait=False)

    return StreamingResponse(event_generator(), media_type="text/event-stream")
