# ParaNet Agent Integration Design

Integrate OpenHands agent framework into ParaNet by porting core modules (controller, events, runtime, LLM) and rebuilding the agent + tool layer for network programming use cases.

## Decision Record

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Target users | Both network engineers and developers | DSL generation + code execution needed |
| Integration method | Source code copy + rewrite | Full control, no upstream dependency |
| Sandbox | Switchable (Docker primary, subprocess fallback) | Flexibility across deployment environments |
| LLM provider | litellm (all models) | Unified interface for GLM, Claude, GPT, etc. |
| Tool scope | All tools (DSL, file, code exec, topology, DB, browse) | Maximum agent capability |
| Architecture | Full port of OpenHands core | Event-driven, extensible, battle-tested |

## Architecture Overview

```
Frontend (React)
    │ SSE
    ▼
Backend (FastAPI)
    │ /agent/chat, /agent/chat-sync
    ▼
AgentController ─── EventStream ─── Runtime (Docker/Local)
    │                                │
    ├─ ParaNetAgent                  ├─ CmdRunAction → shell execution
    │  ├─ System prompt              ├─ FileReadAction → file read
    │  ├─ Tool definitions           ├─ FileWriteAction → file write
    │  └─ Microagents (PNE grammar)  └─ IPythonRunCellAction → python
    │
    ├─ LLM (litellm)
    │  ├─ GLM (default)
    │  ├─ Claude
    │  └─ GPT
    │
    └─ ParaNet Tools
       ├─ DSL: generate, compile, save, template
       ├─ Topology: CRUD nodes/links
       ├─ Database: query, insert, update
       └─ Browse: URL access
```

## Module Layout

```
paranet/agent/
├── core/                    ← Ported from OpenHands
│   ├── controller/
│   │   ├── agent.py             AgentController, state management
│   │   └── state.py             AgentState enum, StateTracker
│   ├── events/
│   │   ├── event.py             Event base class
│   │   ├── action.py            Action types (CmdRun, FileRead, etc.)
│   │   ├── observation.py       Observation types
│   │   └── stream.py            EventStream (asyncio.Queue based)
│   ├── llm/
│   │   ├── registry.py          LLMRegistry (multi-model management)
│   │   └── config.py            litellm configuration
│   └── runtime/
│       ├── base.py              Runtime abstract base class
│       ├── docker_runtime.py    Docker sandbox implementation
│       ├── local_runtime.py     Subprocess fallback
│       └── factory.py           Auto-detection and switching
├── agenthub/
│   └── paranet_agent/
│       ├── agent.py             ParaNetAgent (CodeAct-based)
│       ├── prompts/
│       │   ├── system.py        System prompt with PNE capabilities
│       │   └── skills/          Microagent definitions
│       └── config.py            Agent configuration
├── tools/                   ← ParaNet-specific tools
│   ├── dsl/
│   │   ├── generate.py          generate_dsl action/observation
│   │   ├── compile.py           compile_preview action/observation
│   │   ├── save.py              save_artifacts action/observation
│   │   └── template.py          create_from_template action/observation
│   ├── topology/
│   │   ├── list.py              list_topologies
│   │   ├── get.py               get_topology
│   │   ├── node.py              add_node, remove_node, update_node_config
│   │   └── link.py              add_link, remove_link
│   ├── file/
│   │   ├── read.py              FileReadAction/FileReadObservation
│   │   ├── write.py             FileWriteAction/FileWriteObservation
│   │   ├── edit.py              FileEditAction/FileEditObservation
│   │   └── list.py              ListDirectoryAction
│   ├── code/
│   │   ├── shell.py             CmdRunAction/CmdOutputObservation
│   │   └── python.py            IPythonRunCellAction
│   ├── db/
│   │   ├── query.py             DBQueryAction
│   │   ├── insert.py            DBInsertAction
│   │   └── update.py            DBUpdateAction
│   └── browse/
│       └── url.py               BrowseURLAction
└── prompts/
    ├── system.md                 System prompt template
    ├── skills/
    │   ├── pne-grammar.md        PNE DSL syntax rules
    │   └── compiler-errors.md    Compiler error code reference
    └── templates.py              Prompt template functions
```

Backend integration:
```
backend/app/
├── api/v1/agent.py          ← Modify: wire to AgentController
├── services/
│   ├── agent_orchestrator.py ← Rewrite: thin wrapper over AgentController
│   └── agent_tools/          ← Keep: tool implementations called by Actions
```

Frontend changes:
```
frontend/src/
├── api/agent.ts             ← Extend: new SSE event types
└── components/editor/ChatInput/
    └── index.tsx            ← Adapt: thinking/tool_result display
```

## Event System

### Event Hierarchy

```
Event (base)
├── Action (agent → environment)
│   ├── CmdRunAction              Execute shell command
│   ├── IPythonRunCellAction      Execute Python code
│   ├── FileReadAction            Read file
│   ├── FileWriteAction           Write file
│   ├── FileEditAction            Edit file (string replacement)
│   ├── BrowseURLAction           Visit URL
│   ├── AgentFinishAction         Task complete
│   ├── AgentDelegateAction       Delegate sub-task
│   ├── DSLGenerateAction         Generate PNE DSL
│   ├── CompilePreviewAction      Compile and preview
│   ├── TopologyAction            Topology CRUD operations
│   └── DBQueryAction             Database query
├── Observation (environment → agent)
│   ├── CmdOutputObservation      Command output
│   ├── FileReadObservation       File content
│   ├── FileWriteObservation      Write result
│   ├── ErrorObservation          Error details
│   ├── DSLGenerateObservation    Generated DSL code
│   ├── CompileResultObservation  Compile result/errors
│   ├── TopologyObservation       Topology data
│   └── DBQueryObservation        Query results
└── UserAction
    └── UserMessageAction         User input
```

### EventStream

- Async event bus based on `asyncio.Queue`
- Multi-subscriber support (AgentController, Runtime, SSE bridge)
- Event persistence to SQLite for session recovery
- Each event carries: unique ID, timestamp, source, cause chain

## Agent Controller

### Execution Loop

```
UserMessageAction → Controller
    │
    ├─→ Build State (history + tools + constraints)
    ├─→ Agent.step(state) → Action
    ├─→ EventStream.add(Action)
    ├─→ Runtime.execute(Action) → Observation
    ├─→ EventStream.add(Observation)
    ├─→ Agent.step(state + Observation) → loop...
    └─→ AgentFinishAction → done
```

### State Management

- `AgentState` enum: `RUNNING`, `AWAITING_USER_INPUT`, `FINISHED`, `ERROR`, `PAUSED`
- `StateTracker`: persists state to SQLite, supports session restore
- Max iteration limit (configurable, default 30)
- Budget tracking (token/cost limits)

## LLM Integration

- `LLMRegistry`: manages multiple LLM instances by service ID
- All calls go through litellm for unified interface
- Configuration via `.env`:
  ```
  PARANET_LLM_MODEL=glm-4-flash
  PARANET_LLM_FALLBACK=claude-sonnet-4-20250514
  PARANET_LLM_API_KEY_zhipu=xxx
  PARANET_LLM_API_KEY_anthropic=xxx
  ```
- Function calling / tool_use format handled by litellm
- Streaming responses piped to SSE bridge

## Runtime Sandbox

### Switchable Implementation

`RuntimeFactory.create()`:
1. Check if Docker is available (`docker info`)
2. If yes → `DockerRuntime` (containerized execution)
3. If no → `LocalRuntime` (subprocess, with warning)
4. Config override: `PARANET_RUNTIME=docker|local`

### DockerRuntime

- Mount project workspace into container
- Execute bash/python/p4 commands
- Resource limits: CPU (2 cores), memory (2GB), timeout (120s)
- Container reuse across session (started on first action, stopped on session end)

### LocalRuntime

- `subprocess.run` with timeout
- Working directory isolation
- No network isolation (acceptable for local dev)

## Tool Registry

### ParaNet-Specific Tools

| Tool | Action Type | Description |
|------|-------------|-------------|
| `generate_dsl` | DSLGenerateAction | Generate PNE DSL from description |
| `compile_preview` | CompilePreviewAction | Compile DSL, return result/errors |
| `save_artifacts` | SaveArtifactsAction | Save compiled output to deploy dir |
| `create_from_template` | TemplateCreateAction | Create PNE file from template |
| `list_topologies` | TopologyListAction | List all topologies |
| `get_topology` | TopologyGetAction | Get topology by ID |
| `add_node` | TopologyNodeAction | Add node to topology |
| `remove_node` | TopologyNodeAction | Remove node from topology |
| `add_link` | TopologyLinkAction | Add link to topology |
| `remove_link` | TopologyLinkAction | Remove link from topology |
| `update_node_config` | TopologyNodeConfigAction | Update node configuration |
| `query_db` | DBQueryAction | Execute SQL query |
| `insert_record` | DBInsertAction | Insert database record |
| `update_record` | DBUpdateAction | Update database record |

### General Tools (from OpenHands)

| Tool | Action Type | Description |
|------|-------------|-------------|
| `run_command` | CmdRunAction | Execute shell command |
| `run_python` | IPythonRunCellAction | Execute Python code |
| `read_file` | FileReadAction | Read file content |
| `write_file` | FileWriteAction | Write/create file |
| `edit_file` | FileEditAction | String replacement edit |
| `list_directory` | ListDirectoryAction | Browse directory tree |
| `browse_url` | BrowseURLAction | Visit URL and extract content |

## Backend API Changes

### SSE Event Format (Enhanced)

```typescript
interface AgentStep {
  type: 'thinking' | 'tool_call' | 'tool_result' | 'error' | 'finish'
  tool?: string           // Tool name
  input?: any             // Tool input parameters
  output?: string         // Tool output
  duration_ms?: number    // Execution time
  error?: string          // Error message
}
```

### Session Management

- Each chat creates a `session_id` bound to an `EventStream`
- Session recovery via SQLite-persisted event history
- Agent interruption by unsubscribing from EventStream

### Endpoints (unchanged API surface)

- `POST /agent/chat` — SSE streaming (implementation replaced)
- `POST /agent/chat-sync` — Synchronous (implementation replaced)

## Frontend Changes

1. **`ChatInput/index.tsx`**: Adapt to new SSE event types, add thinking/tool_result display states
2. **`agent.ts`**: Extend callback interface with `onThinking`, `onToolResult`
3. **No changes** to topology editor, DSL editor, or other components

## What We Strip from OpenHands

- Browser agent, visual browsing agent, locate agent
- Conversation manager, GitHub integration
- Authentication/authorization (ParaNet has its own)
- Frontend (ParaNet has its own)
- Plugin marketplace
- App server (ParaNet backend replaces this)

## Dependencies Added

- `litellm` — Multi-model LLM interface
- `docker` (optional) — Docker SDK for Python (sandbox)
- Existing: `lark`, `pydantic`, `fastapi`, `sqlalchemy`
