from pathlib import Path
import sys

ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from backend.app.services.intent_service import translate_natural_language
from backend.app.services.agent_prompt_skills import build_dsl_generation_prompt, resolve_skill_names


def test_resolve_skill_names_falls_back_to_default() -> None:
    assert resolve_skill_names() == ["pne-dsl-grammar"]


def test_build_dsl_generation_prompt_injects_pne_skill() -> None:
    used_skills, prompt = build_dsl_generation_prompt(
        "为当前拓扑生成 IP 路由规则",
        topology_context="Topology demo",
    )

    assert used_skills == ["pne-dsl-grammar"]
    assert "[skill:pne-dsl-grammar]" in prompt
    assert "Translate the user request into valid ParaNet PNE DSL." in prompt


def test_translate_natural_language_falls_back_when_api_key_missing(monkeypatch) -> None:
    monkeypatch.setattr("backend.app.services.intent_service.is_configured", lambda: False)
    result = translate_natural_language(
        "生成一个最小可用的 PNE",
        {"skills": ["pne-dsl-grammar"]},
    )

    assert result["usedSkills"] == ["pne-dsl-grammar"]
    assert "module GeneratedAgent()" in result["dslCode"]
    assert "ZHIPU_API_KEY" in result["explanation"]
    assert isinstance(result["compileResult"], dict)


def test_translate_natural_language_uses_real_llm_path(monkeypatch) -> None:
    monkeypatch.setattr("backend.app.services.intent_service.is_configured", lambda: True)
    monkeypatch.setattr(
        "backend.app.services.intent_service.chat_completion",
        lambda messages: {
            "model": "glm-test",
            "content": "```paranet\nmodule GeneratedAgent() {\n  control {\n    ;\n  }\n}\n\nintent {\n}\n```",
            "usage": {"prompt_tokens": 1, "completion_tokens": 1},
            "raw": {},
        },
    )
    monkeypatch.setattr(
        "backend.app.services.intent_service._build_compile_payload",
        lambda content, topology_id: {
            "success": True,
            "config": {"ip": {}, "ndn": {}, "geo": {}, "p4": {}},
            "errors": [],
            "warnings": [],
            "diagnostics": [],
        },
    )

    result = translate_natural_language("生成最小 PNE", {"skills": ["pne-dsl-grammar"]})

    assert result["usedSkills"] == ["pne-dsl-grammar"]
    assert "module GeneratedAgent()" in result["dslCode"]
    assert "真实智谱 GLM" in result["explanation"]
    assert result["compileResult"]["success"] is True
