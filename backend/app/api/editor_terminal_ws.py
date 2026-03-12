from __future__ import annotations

import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services import editor_terminal_service

router = APIRouter()


@router.websocket("/api/terminal")
async def terminal_ws(websocket: WebSocket) -> None:
    await websocket.accept()
    project_id = websocket.query_params.get("projectId")
    process = await editor_terminal_service.create_terminal_process(project_id)

    async def send_output(text: str) -> None:
        await websocket.send_json({"data": text})

    output_task = asyncio.create_task(
        editor_terminal_service.read_stream(process, send_output)
    )

    try:
        while True:
            data = await websocket.receive_text()
            await editor_terminal_service.write_input(process, data)
    except WebSocketDisconnect:
        pass
    finally:
        output_task.cancel()
        await editor_terminal_service.terminate_process(process)
