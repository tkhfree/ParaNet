"""Agent orchestrator – LLM ↔ tool-calling loop."""

from __future__ import annotations

import json
import logging
import re
import traceback
from typing import Any, Callable

import config
from app.services import zhipu_llm_service as llm
from app.services.agent_tools import get_tool_schemas, execute_tool, tool_names
from app.services.agent_tools.pne_knowledge import PNE_DSL_REFERENCE

logger = logging.getLogger(__name__)

MAX_ITERATIONS = int(getattr(config, "AGENT_MAX_ITERATIONS", "8"))

# Regex to detect when the LLM describes tool usage without actually calling tools
_TOOL_MENTION_PATTERN = re.compile(
    r"(?:调用|使用|执行|运行|run|call|invoke)\s*(?:工具|tool|函数|function).*?"
    r"(?:list_files|read_file|create_file|write_file|list_topologies|get_topology|"
    r"add_topology_node|add_topology_link|remove_topology_node|create_topology|"
    r"generate_dsl|compile_preview|save_deploy_artifacts)",
    re.IGNORECASE,
)

SYSTEM_PROMPT_TEMPLATE = """\
你是 ParaNet 多模态网络基础设施助手。你可以通过工具操作拓扑、文件、编译和部署。

当前上下文:
{context}

重要规则：
- 当用户请求涉及文件、拓扑、编译等操作时，你必须直接调用对应工具获取数据，不要用文字描述你将要做什么。
- 不要说"我将调用某个工具"或"让我查看一下"，而是直接发起工具调用。
- 工具返回数据后，基于数据组织清晰、有条理的中文回复。
- 【极其重要】每次用户询问当前文件列表、拓扑结构等状态信息时，你必须重新调用对应工具（list_files / list_topologies / get_topology）获取最新数据，绝对不能复用对话历史中的旧结果。用户可能在对话期间删除或修改了文件和拓扑。

PNE 文件创建规则（极其重要）：
- 当用户要求创建 PNE 文件时，必须优先使用 create_pne_from_template 工具，根据用户需求选择最合适的模板。
- create_pne_from_template 会自动生成正确语法的 PNE 代码，你不需要手写 PNE 内容。
- fileName 参数必须根据用户的具体需求命名，例如用户要"路由器"就用 router.pne，"ACL 防火墙"就用 firewall.pne。不要重复使用相同的文件名。
- 如果没有合适的模板，再考虑使用 create_file 手动创建，但必须严格遵循下方 PNE 语法参考。
- PNE 不是 JavaScript/Python！禁止使用 let、var、const、forwardTo、console.log、字符串字面量等。
- 创建完 .pne 文件后，建议用 compile_preview 验证编译是否通过。

使用工具时注意:
1. 先用 list_topologies / get_topology 了解当前拓扑结构，再进行操作
2. 添加节点后需添加链路才能连通
3. 生成 DSL 时先用 generate_dsl 工具，再用 compile_preview 验证
4. 编译失败时可尝试修改 DSL 后重新编译
5. 不要假设拓扑节点 ID，先通过 get_topology 确认

{pne_knowledge}

请用中文回复用户。"""


def _build_context(topology_id: str | None, project_id: str | None) -> str:
    parts: list[str] = []
    if project_id:
        parts.append(f"- 项目 ID: {project_id}")
    if topology_id:
        parts.append(f"- 当前拓扑 ID: {topology_id}")
        try:
            from backend.app.services import topology_service
            topo = topology_service.get_topology(topology_id)
            if topo:
                nodes = topo.get("nodes", [])
                links = topo.get("links", [])
                parts.append(f"- 拓扑名称: {topo.get('name', '未知')}")
                parts.append(f"- 节点数量: {len(nodes)}")
                if nodes:
                    for n in nodes:
                        parts.append(f"  - {n.get('name', n.get('id'))} ({n.get('type', 'unknown')})")
                parts.append(f"- 链路数量: {len(links)}")
        except Exception:
            parts.append("- 拓扑详情获取失败")
    if not parts:
        parts.append("- 暂无项目或拓扑上下文")
    return "\n".join(parts)


def run_agent_chat(
    user_message: str,
    *,
    topology_id: str | None = None,
    project_id: str | None = None,
    conversation_history: list[dict[str, str]] | None = None,
    on_step: Callable[[dict[str, Any]], None] | None = None,
) -> dict[str, Any]:
    """Run the agent loop: LLM → tool_calls → execute → result → LLM → ...

    Returns:
        {
            "content": str,       # 最终回复文本
            "steps": list[dict],  # 所有工具调用步骤
            "actions": list[dict],# 建议前端执行的动作
        }
    """
    if not llm.is_configured():
        return {
            "content": "智谱 GLM 未配置（缺少 ZHIPU_API_KEY），无法使用 Agent 功能。",
            "steps": [],
            "actions": [],
        }

    context = _build_context(topology_id, project_id)
    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(context=context, pne_knowledge=PNE_DSL_REFERENCE)

    messages: list[dict[str, Any]] = [
        {"role": "system", "content": system_prompt},
    ]

    # Add conversation history
    if conversation_history:
        for msg in conversation_history:
            messages.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", ""),
            })

    messages.append({"role": "user", "content": user_message})

    tool_schemas = get_tool_schemas()
    all_steps: list[dict[str, Any]] = []
    actions: list[dict[str, Any]] = []
    final_content = ""
    # Track consecutive same-tool calls to detect loops
    _recent_tool_calls: list[str] = []
    MAX_SAME_TOOL_REPEAT = 3
    _loop_detected = False

    for iteration in range(MAX_ITERATIONS):
        logger.info("Agent iteration %d/%d", iteration + 1, MAX_ITERATIONS)

        try:
            result = llm.chat_completion_with_tools(
                messages,
                tools=tool_schemas,
                tool_choice="auto",
            )
        except llm.ZhipuLLMError as exc:
            final_content = f"LLM 调用失败: {exc}"
            break

        assistant_message = result.get("raw", {}).get("choices", [{}])[0].get("message", {})
        content = result.get("content", "")

        # Add assistant message to conversation
        messages.append(assistant_message)

        tool_calls = result.get("tool_calls", [])
        finish_reason = result.get("finish_reason", "stop")

        # If LLM is done (no tool calls), check if it mentioned tools without calling them
        if finish_reason == "stop" or not tool_calls:
            if content and _TOOL_MENTION_PATTERN.search(content):
                # LLM described tool usage but didn't actually call — retry with hint
                print(
                    "LLM mentioned tools without calling them (iteration %d), retrying",
                    iteration + 1,
                )
                messages.append({
                    "role": "user",
                    "content": "你刚才说要调用工具但没有实际调用。请直接发起工具调用，不要描述意图。",
                })
                continue
            final_content = content
            break

        # Process tool calls
        for tc in tool_calls:
            func_name = tc.get("function", {}).get("name", "")
            func_args_str = tc.get("function", {}).get("arguments", "{}")
            tc_id = tc.get("id", "")

            # Loop detection: if same tool called repeatedly, force stop
            _recent_tool_calls.append(func_name)
            if len(_recent_tool_calls) > MAX_SAME_TOOL_REPEAT * 2:
                _recent_tool_calls.pop(0)
            if len(_recent_tool_calls) >= MAX_SAME_TOOL_REPEAT:
                last_n = _recent_tool_calls[-MAX_SAME_TOOL_REPEAT:]
                if len(set(last_n)) == 1:
                    print(
                        "Loop detected: tool '%s' called %d times consecutively. "
                        "Last args: %s",
                        func_name, MAX_SAME_TOOL_REPEAT,
                        func_args_str[:300],
                    )
                    final_content = f"工具 {func_name} 已连续调用 {MAX_SAME_TOOL_REPEAT} 次仍未成功，请尝试调整参数或描述更具体的需求。"
                    _loop_detected = True
                    break

            step: dict[str, Any] = {
                "type": "tool_call",
                "toolName": func_name,
                "arguments": func_args_str,
                "stepIndex": len(all_steps),
            }

            # Parse arguments
            try:
                func_args = json.loads(func_args_str) if isinstance(func_args_str, str) else func_args_str
            except json.JSONDecodeError:
                func_args = {}

            step["argumentsParsed"] = func_args

            print(
                f">>> TOOL CALL: name={func_name} args={json.dumps(func_args, ensure_ascii=False)[:500]}"
            )

            # Notify step start
            if on_step:
                on_step(step)

            # Execute tool
            try:
                tool_result = execute_tool(func_name, func_args)
                step["result"] = tool_result
                step["success"] = "error" not in tool_result
                print(
                    ">>> TOOL RESULT: name=%s success=%s result=%s",
                    func_name,
                    step["success"],
                    json.dumps(tool_result, ensure_ascii=False, default=str)[:500],
                )
            except Exception as exc:
                tool_result = {"error": str(exc)}
                step["result"] = tool_result
                step["success"] = False
                logger.error("Tool '%s' failed: %s", func_name, exc, exc_info=True)

            # Notify step result
            if on_step:
                on_step({
                    "type": "tool_result",
                    "toolName": func_name,
                    "result": tool_result,
                    "success": step["success"],
                    "stepIndex": step["stepIndex"],
                })

            all_steps.append(step)

            # Detect actions for frontend
            _detect_actions(func_name, func_args, tool_result, actions)

            # Add tool result to conversation
            messages.append({
                "role": "tool",
                "content": json.dumps(tool_result, ensure_ascii=False, default=str),
                "tool_call_id": tc_id,
            })

        # If loop was detected in tool processing, exit the main iteration loop
        if _loop_detected:
            break

    else:
        # Loop exhausted
        final_content = final_content or "操作步骤过多，请尝试分步描述您的需求。"

    return {
        "content": final_content,
        "steps": all_steps,
        "actions": actions,
    }


def _detect_actions(
    tool_name: str,
    args: dict[str, Any],
    result: dict[str, Any],
    actions: list[dict[str, Any]],
) -> None:
    """Detect actions that the frontend should perform based on tool results."""
    topology_ops = {
        "add_topology_node", "add_topology_link",
        "remove_topology_node", "create_topology",
    }
    if tool_name in topology_ops and "error" not in result:
        # Avoid duplicate refresh actions
        if not any(a["type"] == "refresh_topology" for a in actions):
            actions.append({"type": "refresh_topology"})

    file_ops = {"create_file", "write_file"}
    if tool_name in file_ops and "error" not in result:
        if not any(a["type"] == "refresh_files" for a in actions):
            actions.append({"type": "refresh_files"})

    if tool_name == "generate_dsl" and result.get("dslCode"):
        actions.append({
            "type": "apply_dsl",
            "payload": {"dslCode": result["dslCode"]},
        })
