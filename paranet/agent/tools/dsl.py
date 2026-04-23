from __future__ import annotations
from typing import Any
from paranet.agent.core.events.action import DSLGenerateAction, CompilePreviewAction, SaveArtifactsAction, TemplateCreateAction
from paranet.agent.core.events.observation import DSLGenerateObservation, CompileResultObservation, Observation


def generate_dsl_with_llm(description: str, topology_context: str = "") -> str:
    return f"# Generated from: {description}\n"

def compile_dsl_code(dsl_code: str) -> dict[str, Any]:
    return {"success": True, "output": "OK", "errors": []}


class DSLToolHandler:
    def handle_generate(self, action: DSLGenerateAction) -> DSLGenerateObservation:
        dsl_code = generate_dsl_with_llm(action.description, action.topology_context)
        return DSLGenerateObservation(content=dsl_code, dsl_code=dsl_code)

    def handle_compile(self, action: CompilePreviewAction) -> CompileResultObservation:
        result = compile_dsl_code(action.dsl_code)
        return CompileResultObservation(
            content=result.get("output", ""),
            success=result.get("success", False),
            errors=result.get("errors", []),
        )

    def handle_save(self, action: SaveArtifactsAction) -> Observation:
        return Observation(content=f"Saved artifacts for project {action.project_id}")

    def handle_template(self, action: TemplateCreateAction) -> Observation:
        return Observation(content=f"Created {action.template_name} template for project {action.project_id}")
