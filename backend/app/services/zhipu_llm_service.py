from __future__ import annotations

from typing import Any

import httpx

import config


class ZhipuLLMError(RuntimeError):
    """Raised when the GLM API request fails or returns invalid content."""


def is_configured() -> bool:
    return bool(config.ZHIPU_API_KEY)


def _chat_completions_url(base_url: str) -> str:
    normalized = str(base_url or "").strip().rstrip("/")
    if not normalized:
        raise ZhipuLLMError("未配置智谱 GLM base URL")
    if normalized.endswith("/chat/completions"):
        return normalized
    return f"{normalized}/chat/completions"


def _extract_text_content(content: Any) -> str:
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
                continue
            if not isinstance(item, dict):
                continue
            text = item.get("text")
            if isinstance(text, str) and text.strip():
                parts.append(text)
        return "\n".join(part.strip() for part in parts if part.strip()).strip()
    return ""


def chat_completion(
    messages: list[dict[str, str]],
    *,
    model: str | None = None,
    temperature: float | None = None,
    max_tokens: int | None = None,
    timeout_seconds: float | None = None,
) -> dict[str, Any]:
    if not is_configured():
        raise ZhipuLLMError("未配置 ZHIPU_API_KEY，无法调用智谱 GLM")

    request_model = (model or config.ZHIPU_MODEL or "glm-4-flash").strip()
    payload = {
        "model": request_model,
        "messages": messages,
        "temperature": config.ZHIPU_TEMPERATURE if temperature is None else temperature,
        "max_tokens": config.ZHIPU_MAX_TOKENS if max_tokens is None else max_tokens,
    }

    headers = {
        "Authorization": f"Bearer {config.ZHIPU_API_KEY}",
        "Content-Type": "application/json",
    }
    timeout = timeout_seconds if timeout_seconds is not None else config.ZHIPU_TIMEOUT_SECONDS
    url = _chat_completions_url(config.ZHIPU_BASE_URL)

    try:
        response = httpx.post(url, json=payload, headers=headers, timeout=timeout)
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        detail = exc.response.text
        raise ZhipuLLMError(f"智谱 GLM 请求失败: {detail}") from exc
    except httpx.HTTPError as exc:
        raise ZhipuLLMError(f"智谱 GLM 网络请求失败: {exc}") from exc

    data = response.json()
    choices = data.get("choices")
    if not isinstance(choices, list) or not choices:
        raise ZhipuLLMError("智谱 GLM 响应缺少 choices")

    message = choices[0].get("message") if isinstance(choices[0], dict) else None
    if not isinstance(message, dict):
        raise ZhipuLLMError("智谱 GLM 响应缺少 message")

    content = _extract_text_content(message.get("content"))
    if not content:
        raise ZhipuLLMError("智谱 GLM 未返回可用文本内容")

    usage = data.get("usage") if isinstance(data.get("usage"), dict) else None
    return {
        "model": str(data.get("model") or request_model),
        "content": content,
        "tool_calls": [],
        "finish_reason": choices[0].get("finish_reason", "stop"),
        "usage": usage,
        "raw": data,
    }


def chat_completion_with_tools(
    messages: list[dict[str, Any]],
    *,
    tools: list[dict[str, Any]] | None = None,
    tool_choice: str = "auto",
    model: str | None = None,
    temperature: float | None = None,
    max_tokens: int | None = None,
    timeout_seconds: float | None = None,
) -> dict[str, Any]:
    """Chat completion with function/tool calling support.

    Returns ``{model, content, tool_calls, finish_reason, usage, raw}``.
    When the LLM decides to call tools, *content* may be empty and
    *tool_calls* will contain the invocation details.
    """
    if not is_configured():
        raise ZhipuLLMError("未配置 ZHIPU_API_KEY，无法调用智谱 GLM")

    request_model = (model or config.ZHIPU_MODEL or "glm-4-flash").strip()
    payload: dict[str, Any] = {
        "model": request_model,
        "messages": messages,
        "temperature": config.ZHIPU_TEMPERATURE if temperature is None else temperature,
        "max_tokens": config.ZHIPU_MAX_TOKENS if max_tokens is None else max_tokens,
    }

    if tools:
        payload["tools"] = tools
        payload["tool_choice"] = tool_choice

    headers = {
        "Authorization": f"Bearer {config.ZHIPU_API_KEY}",
        "Content-Type": "application/json",
    }
    timeout = timeout_seconds if timeout_seconds is not None else config.ZHIPU_TIMEOUT_SECONDS
    url = _chat_completions_url(config.ZHIPU_BASE_URL)

    try:
        response = httpx.post(url, json=payload, headers=headers, timeout=timeout)
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        detail = exc.response.text
        raise ZhipuLLMError(f"智谱 GLM 请求失败: {detail}") from exc
    except httpx.HTTPError as exc:
        raise ZhipuLLMError(f"智谱 GLM 网络请求失败: {exc}") from exc

    data = response.json()
    choices = data.get("choices")
    if not isinstance(choices, list) or not choices:
        raise ZhipuLLMError("智谱 GLM 响应缺少 choices")

    message = choices[0].get("message") if isinstance(choices[0], dict) else None
    if not isinstance(message, dict):
        raise ZhipuLLMError("智谱 GLM 响应缺少 message")

    content = _extract_text_content(message.get("content"))
    finish_reason = choices[0].get("finish_reason", "stop")

    # Parse tool_calls if present
    raw_tool_calls = message.get("tool_calls")
    tool_calls: list[dict[str, Any]] = []
    if isinstance(raw_tool_calls, list):
        for tc in raw_tool_calls:
            if not isinstance(tc, dict):
                continue
            func = tc.get("function")
            if not isinstance(func, dict):
                continue
            tool_calls.append({
                "id": tc.get("id", ""),
                "type": tc.get("type", "function"),
                "function": {
                    "name": func.get("name", ""),
                    "arguments": func.get("arguments", "{}"),
                },
            })

    usage = data.get("usage") if isinstance(data.get("usage"), dict) else None
    return {
        "model": str(data.get("model") or request_model),
        "content": content,
        "tool_calls": tool_calls,
        "finish_reason": finish_reason,
        "usage": usage,
        "raw": data,
    }
