"""ParaNetAgent - CodeAct-based agent for network programming."""
from __future__ import annotations

from typing import Any

from paranet.agent.core.controller.agent import Agent
from paranet.agent.core.controller.state import State
from paranet.agent.core.events.action import Action
from paranet.agent.core.llm.llm import LLM

from paranet.agent.agenthub.paranet_agent.config import ParaNetAgentConfig
from paranet.agent.agenthub.paranet_agent.function_calling import response_to_actions

SYSTEM_PROMPT = """\
You are ParaNetAgent, an intelligent assistant for multi-modal programmable network infrastructure.

You can help users with:
- Writing and compiling PNE DSL programs for network topology
- Running shell commands and Python code
- Managing topology configurations (create, update, delete nodes/links)
- Querying network state from the database
- Generating DSL from natural language descriptions
- Browsing documentation and resources

Always reason step-by-step and use the available tools to accomplish tasks.
When you are done, call the finish tool with a summary of what you accomplished.
"""


class ParaNetAgent(Agent):
    def __init__(self, config: ParaNetAgentConfig):
        super().__init__(config)
        self.config: ParaNetAgentConfig = config
        self._llm = LLM(
            model=config.model,
            api_key=config.api_key,
            api_base=config.api_base,
            temperature=config.temperature,
        )

    def step(self, state: State) -> Action:
        messages = self._build_messages(state)
        tools = self.get_tools()
        response = self._llm.completion(messages=messages, tools=tools or None)
        actions = response_to_actions(response)
        return actions[0]

    def reset(self) -> None:
        self._llm = LLM(
            model=self.config.model,
            api_key=self.config.api_key,
            api_base=self.config.api_base,
            temperature=self.config.temperature,
        )

    def get_tools(self) -> list[dict[str, Any]]:
        """Return tool definitions in OpenAI function calling format."""
        tools: list[dict[str, Any]] = []

        if self.config.enable_cmd:
            tools.append(
                {
                    "type": "function",
                    "function": {
                        "name": "run_command",
                        "description": "Execute a shell command and return the output.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "command": {
                                    "type": "string",
                                    "description": "The shell command to execute.",
                                }
                            },
                            "required": ["command"],
                        },
                    },
                }
            )

        if self.config.enable_ipython:
            tools.append(
                {
                    "type": "function",
                    "function": {
                        "name": "run_python",
                        "description": "Execute Python code and return the output.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "code": {
                                    "type": "string",
                                    "description": "The Python code to execute.",
                                }
                            },
                            "required": ["code"],
                        },
                    },
                }
            )

        if self.config.enable_file_tools:
            tools.extend(
                [
                    {
                        "type": "function",
                        "function": {
                            "name": "read_file",
                            "description": "Read the contents of a file.",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "path": {
                                        "type": "string",
                                        "description": "Path to the file to read.",
                                    }
                                },
                                "required": ["path"],
                            },
                        },
                    },
                    {
                        "type": "function",
                        "function": {
                            "name": "write_file",
                            "description": "Write content to a file, creating it if needed.",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "path": {
                                        "type": "string",
                                        "description": "Path to the file to write.",
                                    },
                                    "content": {
                                        "type": "string",
                                        "description": "Content to write to the file.",
                                    },
                                },
                                "required": ["path", "content"],
                            },
                        },
                    },
                    {
                        "type": "function",
                        "function": {
                            "name": "edit_file",
                            "description": "Edit a file by replacing old text with new text.",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "path": {
                                        "type": "string",
                                        "description": "Path to the file to edit.",
                                    },
                                    "old_str": {
                                        "type": "string",
                                        "description": "Text to find and replace.",
                                    },
                                    "new_str": {
                                        "type": "string",
                                        "description": "Replacement text.",
                                    },
                                },
                                "required": ["path", "old_str", "new_str"],
                            },
                        },
                    },
                ]
            )

        if self.config.enable_browse:
            tools.append(
                {
                    "type": "function",
                    "function": {
                        "name": "browse_url",
                        "description": "Browse a URL and return the page content.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "url": {
                                    "type": "string",
                                    "description": "The URL to browse.",
                                }
                            },
                            "required": ["url"],
                        },
                    },
                }
            )

        if self.config.enable_dsl_tools:
            tools.extend(
                [
                    {
                        "type": "function",
                        "function": {
                            "name": "generate_dsl",
                            "description": "Generate PNE DSL code from a natural language description.",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "description": {
                                        "type": "string",
                                        "description": "Natural language description of the network.",
                                    },
                                    "topology_context": {
                                        "type": "string",
                                        "description": "Optional existing topology context.",
                                    },
                                },
                                "required": ["description"],
                            },
                        },
                    },
                    {
                        "type": "function",
                        "function": {
                            "name": "compile_preview",
                            "description": "Compile DSL code and return a preview of the result.",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "dsl_code": {
                                        "type": "string",
                                        "description": "The DSL code to compile.",
                                    }
                                },
                                "required": ["dsl_code"],
                            },
                        },
                    },
                    {
                        "type": "function",
                        "function": {
                            "name": "save_artifacts",
                            "description": "Save DSL code as project artifacts.",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "dsl_code": {
                                        "type": "string",
                                        "description": "The DSL code to save.",
                                    },
                                    "project_id": {
                                        "type": "string",
                                        "description": "The project ID.",
                                    },
                                    "file_name": {
                                        "type": "string",
                                        "description": "Name for the saved file.",
                                    },
                                },
                                "required": ["dsl_code"],
                            },
                        },
                    },
                    {
                        "type": "function",
                        "function": {
                            "name": "create_from_template",
                            "description": "Create DSL from a predefined template.",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "template_name": {
                                        "type": "string",
                                        "description": "Name of the template to use.",
                                    },
                                    "project_id": {
                                        "type": "string",
                                        "description": "The project ID.",
                                    },
                                    "file_name": {
                                        "type": "string",
                                        "description": "Name for the output file.",
                                    },
                                },
                                "required": ["template_name"],
                            },
                        },
                    },
                ]
            )

        if self.config.enable_topology_tools:
            tools.append(
                {
                    "type": "function",
                    "function": {
                        "name": "topology_op",
                        "description": "Perform a topology operation (create, read, update, delete on nodes/links).",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "operation": {
                                    "type": "string",
                                    "description": "The operation to perform (e.g. 'add_node', 'remove_link').",
                                },
                                "params": {
                                    "type": "object",
                                    "description": "Parameters for the operation.",
                                },
                                "topology_id": {
                                    "type": "string",
                                    "description": "ID of the target topology.",
                                },
                            },
                            "required": ["operation"],
                        },
                    },
                }
            )

        if self.config.enable_db_tools:
            tools.append(
                {
                    "type": "function",
                    "function": {
                        "name": "query_db",
                        "description": "Query the network state database.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "query": {
                                    "type": "string",
                                    "description": "The database query string.",
                                },
                                "params": {
                                    "type": "object",
                                    "description": "Query parameters.",
                                },
                            },
                            "required": ["query"],
                        },
                    },
                }
            )

        if self.config.enable_finish:
            tools.append(
                {
                    "type": "function",
                    "function": {
                        "name": "finish",
                        "description": "Signal that the task is complete with a summary.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "message": {
                                    "type": "string",
                                    "description": "Summary of what was accomplished.",
                                }
                            },
                            "required": ["message"],
                        },
                    },
                }
            )

        return tools

    def _build_messages(self, state: State) -> list[dict[str, Any]]:
        """Build the message list for the LLM call."""
        messages: list[dict[str, Any]] = [
            {"role": "system", "content": SYSTEM_PROMPT}
        ]
        messages.extend(state.history)
        return messages
