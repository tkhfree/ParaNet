from __future__ import annotations

from typing import Any

from paranet.agent.core.events.action import (
    DSLGenerateAction,
    CompilePreviewAction,
    SaveArtifactsAction,
    TemplateCreateAction,
    IntentAction,
)
from paranet.agent.core.events.observation import (
    DSLGenerateObservation,
    CompileResultObservation,
    Observation,
)


class DSLToolHandler:
    def _get_service(self):
        import sys
        from pathlib import Path
        backend_dir = str(Path(__file__).resolve().parents[3] / "backend")
        if backend_dir not in sys.path:
            sys.path.insert(0, backend_dir)
        from app.services import intent_service
        return intent_service

    def handle_generate(self, action: DSLGenerateAction) -> DSLGenerateObservation:
        intent_service = self._get_service()
        dsl_code = intent_service.compile_preview(
            content=action.description,
            topology_id=None,
        )
        if dsl_code.get("success"):
            return DSLGenerateObservation(
                content=f"DSL compiled successfully from description:\n{action.description}",
                dsl_code=action.description,
            )
        errors = dsl_code.get("errors", [])
        return DSLGenerateObservation(
            content=f"DSL generation note: input treated as raw PNE code. Errors: {errors}",
            dsl_code=action.description,
        )

    def handle_compile(self, action: CompilePreviewAction) -> CompileResultObservation:
        import json
        intent_service = self._get_service()
        result = intent_service.compile_preview(
            content=action.dsl_code,
            topology_id=None,
        )
        return CompileResultObservation(
            content=json.dumps(result, ensure_ascii=False) if result.get("success") else f"Compile failed: {result.get('errors', [])}",
            success=result.get("success", False),
            errors=result.get("errors", []),
        )

    def handle_save(self, action: SaveArtifactsAction) -> Observation:
        if not action.project_id:
            return Observation(content="Error: project_id is required for save_artifacts.")
        intent_service = self._get_service()
        result = intent_service.save_deploy_artifacts(
            project_id=action.project_id,
            content=action.dsl_code,
            topology_id=None,
            name=action.file_name or "Agent generated",
        )
        success = result.get("success", False)
        written = result.get("written", [])
        if success:
            return Observation(content=f"Artifacts saved. Written files: {written}")
        errors = result.get("errors", [])
        return Observation(content=f"Save failed: {errors}")

    def handle_template(self, action: TemplateCreateAction) -> Observation:
        if not action.project_id:
            return Observation(content="Error: project_id is required for create_from_template.")
        if not action.template_name:
            return Observation(content="Error: template_name is required for create_from_template.")

        from paranet.agent.tools.pne_templates import get_template, get_template_names

        tmpl = get_template(action.template_name)
        if tmpl is None:
            available = ", ".join(get_template_names())
            return Observation(content=f"Error: unknown template '{action.template_name}'. Available: {available}")

        file_name = action.file_name or f"{action.template_name}.pne"
        if not file_name.endswith(".pne"):
            file_name += ".pne"

        try:
            from app.services import editor_file_service
            editor_file_service.create_file(
                project_id=action.project_id,
                file_name=file_name,
                is_folder=0,
                file_type=2,
                content=tmpl["content"],
            )
        except Exception as exc:
            err_msg = str(exc)
            if "同名文件" in err_msg:
                base = file_name.removesuffix(".pne")
                file_name = f"{base}_1.pne"
                editor_file_service.create_file(
                    project_id=action.project_id,
                    file_name=file_name,
                    is_folder=0,
                    file_type=2,
                    content=tmpl["content"],
                )
            else:
                return Observation(content=f"Error creating file: {err_msg}")

        return Observation(
            content=f"File '{file_name}' created from template '{tmpl['name']}' in project {action.project_id}.\n---\n{tmpl['content']}"
        )

    def handle_intent(self, action: IntentAction) -> Observation:
        op = (action.operation or "").strip().lower()
        params = action.params or {}
        intent_id = (action.intent_id or "").strip()

        try:
            if op == "list":
                return self._intent_list(params)
            elif op == "get":
                return self._intent_get(intent_id)
            elif op == "create":
                return self._intent_create(params)
            elif op == "update":
                return self._intent_update(intent_id, params)
            elif op == "delete":
                return self._intent_delete(intent_id)
            elif op == "compile":
                return self._intent_compile(params)
            else:
                return Observation(content=f"Unknown intent operation: {op}")
        except Exception as exc:
            return Observation(content=f"Intent operation '{op}' failed: {exc}")

    def _intent_list(self, params: dict) -> Observation:
        import json as _json
        svc = self._get_service()
        result = svc.list_intents(
            page_no=params.get("page_no", 1),
            page_size=params.get("page_size", 50),
            status=params.get("status"),
            project_id=params.get("project_id"),
        )
        return Observation(content=_json.dumps(result, ensure_ascii=False, indent=2) if isinstance(result, (dict, list)) else str(result))

    def _intent_get(self, intent_id: str) -> Observation:
        import json as _json
        if not intent_id:
            return Observation(content="Error: intent_id is required for 'get'.")
        svc = self._get_service()
        result = svc.get_intent(intent_id)
        if not result:
            return Observation(content=f"Intent {intent_id} not found.")
        return Observation(content=_json.dumps(result, ensure_ascii=False, indent=2))

    def _intent_create(self, params: dict) -> Observation:
        import json as _json
        svc = self._get_service()
        result = svc.create_intent(
            name=params.get("name", "Agent created"),
            description=params.get("description"),
            type=params.get("type"),
            content=params.get("content", ""),
            topology_id=params.get("topology_id"),
            project_id=params.get("project_id"),
        )
        return Observation(content=f"Intent created:\n{_json.dumps(result, ensure_ascii=False, indent=2) if isinstance(result, (dict, list)) else str(result)}")

    def _intent_update(self, intent_id: str, params: dict) -> Observation:
        import json as _json
        if not intent_id:
            return Observation(content="Error: intent_id is required for 'update'.")
        svc = self._get_service()
        updates = {k: v for k, v in params.items() if v is not None}
        result = svc.update_intent(intent_id, **updates)
        if not result:
            return Observation(content=f"Intent {intent_id} not found.")
        return Observation(content=f"Intent updated:\n{_json.dumps(result, ensure_ascii=False, indent=2)}")

    def _intent_delete(self, intent_id: str) -> Observation:
        if not intent_id:
            return Observation(content="Error: intent_id is required for 'delete'.")
        svc = self._get_service()
        if svc.delete_intent(intent_id):
            return Observation(content=f"Intent {intent_id} deleted.")
        return Observation(content=f"Intent {intent_id} not found.")

    def _intent_compile(self, params: dict) -> Observation:
        import json as _json
        intent_id = params.get("intent_id", "")
        topology_id = params.get("topology_id")
        if not intent_id:
            return Observation(content="Error: intent_id is required for 'compile'.")
        svc = self._get_service()
        result = svc.compile_intent(intent_id, topology_id)
        return Observation(content=_json.dumps(result, ensure_ascii=False, indent=2) if isinstance(result, (dict, list)) else str(result))
