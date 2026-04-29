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
- Managing files and projects
- Deploying and monitoring network configurations
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

            if self.config.enable_file_tools:
                tools.append(
                    {
                        "type": "function",
                        "function": {
                            "name": "file_op",
                            "description": (
                                "Manage project files. Operations: "
                                "'list' (list file tree for a project), "
                                "'create' (create a new file), "
                                "'delete' (delete a file), "
                                "'rename' (rename a file), "
                                "'move' (move a file to a different folder)."
                            ),
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "operation": {
                                        "type": "string",
                                        "description": "One of: list, create, delete, rename, move.",
                                    },
                                    "params": {
                                        "type": "object",
                                        "description": (
                                            "Operation parameters. "
                                            "list: {project_id}. "
                                            "create: {project_id, file_name, content, parent_id, is_folder}. "
                                            "delete: {file_id}. "
                                            "rename: {file_id, file_name}. "
                                            "move: {file_id, parent_id}."
                                        ),
                                    },
                                    "project_id": {
                                        "type": "string",
                                        "description": "Project ID (required for list, create).",
                                    },
                                },
                                "required": ["operation"],
                            },
                        },
                    }
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

        if self.config.enable_dsl_tools:
            tools.append(
                {
                    "type": "function",
                    "function": {
                        "name": "intent_op",
                        "description": (
                            "Manage compile artifacts / intents. Operations: "
                            "'list' (list artifacts, optionally filter by project_id), "
                            "'get' (get artifact by id), "
                            "'create' (create a new artifact), "
                            "'update' (update artifact), "
                            "'delete' (delete artifact), "
                            "'compile' (compile a saved artifact)."
                        ),
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "operation": {
                                    "type": "string",
                                    "description": "One of: list, get, create, update, delete, compile.",
                                },
                                "params": {
                                    "type": "object",
                                    "description": (
                                        "Operation parameters. "
                                        "list: {project_id, status}. "
                                        "create: {name, description, type, content, topology_id, project_id}. "
                                        "update: {name, description, type, content}. "
                                        "compile: {intent_id, topology_id}."
                                    ),
                                },
                                "intent_id": {
                                    "type": "string",
                                    "description": "Artifact ID (required for get, update, delete, compile).",
                                },
                            },
                            "required": ["operation"],
                        },
                    },
                }
            )

        if self.config.enable_topology_tools:
            tools.append(
                {
                    "type": "function",
                    "function": {
                        "name": "topology_op",
                        "description": (
                            "Perform a topology operation. Use this to create/view/modify network topologies "
                            "(nodes and links). Supported operations: "
                            "'list' (list all topologies, optionally filter by project_id), "
                            "'get' (get a single topology by id), "
                            "'create' (create a new topology with name, nodes, links), "
                            "'update' (update topology name, nodes, or links by id), "
                            "'delete' (delete a topology by id), "
                            "'add_node' (add a node to an existing topology), "
                            "'add_link' (add a link between two nodes), "
                            "'remove_node' (remove a node by id), "
                            "'remove_link' (remove a link by id), "
                                "'export' (export topology as JSON), "
                                "'import' (import topology from JSON), "
                                "'snapshot' (get topology without materialization)."
                        ),
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "operation": {
                                    "type": "string",
                                    "description": "One of: list, get, create, update, delete, add_node, add_link, remove_node, remove_link, export, import, snapshot.",
                                },
                                "params": {
                                    "type": "object",
                                    "description": (
                                        "Operation parameters. "
                                        "create: {name, project_id, nodes: [{id, name, type, position: {x,y}}], links: [{id, source, target}]}. "
                                        "add_node: {node: {id, name, type, position: {x,y}}}. "
                                        "add_link: {link: {id, source, target}}. "
                                        "remove_node/remove_link: {item_id}. "
                                        "import: {name, project_id, nodes, links}. "
                                        "list: {project_id} (optional). "
                                        "get/delete/export/snapshot: uses topology_id directly."
                                    ),
                                },
                                "topology_id": {
                                    "type": "string",
                                    "description": "ID of the target topology (required for get, update, delete, add_node, add_link, remove_node, remove_link, export, snapshot).",
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

        # Project management tool
        tools.append(
            {
                "type": "function",
                "function": {
                    "name": "project_op",
                    "description": (
                        "Manage projects. Operations: "
                        "'list' (list all projects), "
                        "'get' (get project by id), "
                        "'create' (create a new project with name), "
                        "'update' (update project name/remarke/topologyId), "
                        "'delete' (delete a project by id)."
                    ),
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "operation": {
                                "type": "string",
                                "description": "One of: list, get, create, update, delete.",
                            },
                            "params": {
                                "type": "object",
                                "description": (
                                    "Operation parameters. "
                                    "create: {name, remark}. "
                                    "update: {name, remark, topologyId, currentFileId}. "
                                    "list: no params needed."
                                ),
                            },
                            "project_id": {
                                "type": "string",
                                "description": "Project ID (required for get, update, delete).",
                            },
                        },
                        "required": ["operation"],
                    },
                },
            }
        )

        # Deploy tool
        tools.append(
            {
                "type": "function",
                "function": {
                    "name": "deploy_op",
                    "description": (
                        "Manage deployments. Operations: "
                        "'list' (list deployments), "
                        "'prepare' (create a deployment record), "
                        "'status' (get deployment status), "
                        "'logs' (get deployment logs), "
                        "'rollback' (rollback a deployment), "
                        "'cancel' (cancel a running deployment), "
                        "'validate' (validate deployment config), "
                        "'preview' (preview deployment)."
                    ),
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "operation": {
                                "type": "string",
                                "description": "One of: list, prepare, status, logs, rollback, cancel, validate, preview.",
                            },
                            "params": {
                                "type": "object",
                                "description": (
                                    "Operation parameters. "
                                    "list: {project_id, page_no, page_size}. "
                                    "prepare/validate/preview: {intent_id, topology_id, project_id, dry_run}. "
                                    "status/logs/rollback/cancel: uses deploy_id."
                                ),
                            },
                            "deploy_id": {
                                "type": "string",
                                "description": "Deployment ID (required for status, logs, rollback, cancel).",
                            },
                        },
                        "required": ["operation"],
                    },
                },
            }
        )

        # Monitor tool
        tools.append(
            {
                "type": "function",
                "function": {
                    "name": "monitor_op",
                    "description": (
                        "Query system health and monitoring data. Operations: "
                        "'health' (system health status), "
                        "'node_metrics' (node performance metrics), "
                        "'link_metrics' (link performance metrics), "
                        "'alerts' (active alerts), "
                        "'acknowledge_alert' (acknowledge an alert), "
                        "'alert_rules' (list alert rules), "
                        "'create_alert_rule' (create an alert rule), "
                        "'update_alert_rule' (update an alert rule), "
                        "'delete_alert_rule' (delete an alert rule), "
                        "'terminal_logs' (get terminal logs for a node)."
                    ),
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "operation": {
                                "type": "string",
                                "description": "One of: health, node_metrics, link_metrics, alerts, acknowledge_alert, alert_rules, create_alert_rule, update_alert_rule, delete_alert_rule, terminal_logs.",
                            },
                            "params": {
                                "type": "object",
                                "description": (
                                    "Operation parameters. "
                                    "node_metrics: {node_ids, start_time, end_time, interval}. "
                                    "link_metrics: {link_ids, start_time, end_time, interval}. "
                                    "alerts: {acknowledged, level}. "
                                    "acknowledge_alert: {alert_id}. "
                                    "create_alert_rule: {name, enabled, type, threshold, duration, actions}. "
                                    "update_alert_rule: {rule_id, name, enabled, type, threshold, duration, actions}. "
                                    "delete_alert_rule: {rule_id}. "
                                    "terminal_logs: {node_id, lines}."
                                ),
                            },
                        },
                        "required": ["operation"],
                    },
                },
            }
        )

        # Device legend tool
        tools.append(
            {
                "type": "function",
                "function": {
                    "name": "device_legend_op",
                    "description": (
                        "Manage device type legends for topology editor. Operations: "
                        "'list' (list all device legends), "
                        "'get' (get legend by id), "
                        "'create' (create a new legend), "
                        "'update' (update a legend), "
                        "'delete' (delete a legend)."
                    ),
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "operation": {
                                "type": "string",
                                "description": "One of: list, get, create, update, delete.",
                            },
                            "params": {
                                "type": "object",
                                "description": (
                                    "Operation parameters. "
                                    "create: {type, label, image_key, color, sort}. "
                                    "update: {type, label, image_key, color, sort}."
                                ),
                            },
                            "legend_id": {
                                "type": "string",
                                "description": "Legend ID (required for get, update, delete).",
                            },
                        },
                        "required": ["operation"],
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
