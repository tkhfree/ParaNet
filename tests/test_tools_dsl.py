"""Tests for DSL tool handlers."""
import pytest
from unittest.mock import patch, MagicMock
from paranet.agent.tools.dsl import DSLToolHandler
from paranet.agent.core.events.action import DSLGenerateAction, CompilePreviewAction
from paranet.agent.core.events.observation import DSLGenerateObservation, CompileResultObservation


@patch("paranet.agent.tools.dsl.generate_dsl_with_llm")
def test_dsl_generate(mock_gen):
    mock_gen.return_value = "node h1 { role: host; }"
    handler = DSLToolHandler()
    obs = handler.handle_generate(DSLGenerateAction(description="simple host"))
    assert isinstance(obs, DSLGenerateObservation)
    assert "node h1" in obs.content


@patch("paranet.agent.tools.dsl.compile_dsl_code")
def test_dsl_compile_success(mock_compile):
    mock_compile.return_value = {"success": True, "output": "OK", "errors": []}
    handler = DSLToolHandler()
    obs = handler.handle_compile(CompilePreviewAction(dsl_code="node h1 { role: host; }"))
    assert isinstance(obs, CompileResultObservation)
    assert obs.success is True


@patch("paranet.agent.tools.dsl.compile_dsl_code")
def test_dsl_compile_failure(mock_compile):
    mock_compile.return_value = {"success": False, "output": "", "errors": ["syntax error at line 1"]}
    handler = DSLToolHandler()
    obs = handler.handle_compile(CompilePreviewAction(dsl_code="invalid {"))
    assert isinstance(obs, CompileResultObservation)
    assert obs.success is False
    assert len(obs.errors) == 1
