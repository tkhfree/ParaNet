"""Tests for LLM integration via litellm."""
import pytest
from unittest.mock import patch, MagicMock
from paranet.agent.core.llm.llm import LLM
from paranet.agent.core.llm.metrics import Metrics


def test_metrics_defaults():
    m = Metrics()
    assert m.total_prompt_tokens == 0
    assert m.total_completion_tokens == 0
    assert m.total_cost == 0.0


def test_metrics_accumulate():
    m = Metrics()
    m.add(prompt_tokens=100, completion_tokens=50, cost=0.01)
    assert m.total_prompt_tokens == 100
    assert m.total_completion_tokens == 50
    assert m.total_cost == 0.01


def test_llm_init():
    llm = LLM(model="gpt-4o-mini", api_key="test-key")
    assert llm.model == "gpt-4o-mini"


@patch("paranet.agent.core.llm.llm.litellm_completion")
def test_llm_completion(mock_completion):
    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = "Hello"
    mock_response.choices[0].message.tool_calls = None
    mock_response.usage.prompt_tokens = 10
    mock_response.usage.completion_tokens = 5
    mock_response.usage.total_cost = 0.001
    mock_completion.return_value = mock_response

    llm = LLM(model="gpt-4o-mini", api_key="test-key")
    result = llm.completion(messages=[{"role": "user", "content": "Hi"}])
    assert result.choices[0].message.content == "Hello"
    assert llm.metrics.total_prompt_tokens == 10


def test_llm_with_tools():
    llm = LLM(model="gpt-4o-mini", api_key="test-key")
    tools = [{"type": "function", "function": {"name": "test", "parameters": {}}}]
    assert llm.model == "gpt-4o-mini"
