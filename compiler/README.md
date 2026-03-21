# Unified Compiler Layout

This folder is the ParaNet unified compiler pipeline.

## Directory Structure

- `frontend/`: PNE parsing (supports optional `intent { ... }` overlay blocks)
  - `preprocessor.py`: include/.domain expansion
  - `pne_ast.py`: AST node definitions (includes intent overlay types)
  - `pne_parser.py`: Lark-based parser
  - `grammar_pne.lark`, `grammar_pne_intent.lark`: grammars
- `semantic/`: AST → ProgramIR / IntentIR collection
  - `collector_pne.py`: PNE AST → ProgramIR
  - `validator.py`, `symbols.py`: validation placeholders
- `ir/`: IR definitions (common, program, instructions, fragment, node_plan, intent, resources, capabilities)
- `lowering/`: ProgramIR → FragmentIR (MVP v0 in `fragment_builder.py`)
- `placement/`: FragmentIR → NodePlanIR (MVP v0 in `planner.py`)
- `backend/`: NodePlanIR + FragmentIR → **BMv2 (v1model)** or **Tofino (TNA)** P4 + JSON entries (`bmv2_emitter.py`, `tofino_emitter.py`, `factory.py`); `stub` for placeholders
- `pipeline.py`: end-to-end `compile_pipeline`
- `runtime/`: manifest, artifacts, deploy (placeholder)
- `cli/`: command-line entrypoint (placeholder)

## Usage

```python
from compiler import get_pne_parser, compile_pne_to_program_ir

parser = get_pne_parser()
result = parser.parse_text("service [s1] { a -> b } application a { }")
program = compile_pne_to_program_ir(Path("example.pne"))
```

### MVP pipeline (ProgramIR → FragmentIR → NodePlanIR → stub artifacts)

```python
from pathlib import Path

from compiler import compile_pipeline

result = compile_pipeline(
    pne_text,
    topology_snapshot={
        "nodes": [
            {"id": "core-1", "capabilities": {"dataPlaneTarget": "bmv2"}},
            {"id": "edge-1", "capabilities": {"dataPlaneTarget": "tofino"}},
        ]
    },
    output_dir=Path("out"),
    # 可选：override_target="bmv2" 强制所有节点同一后端（等同旧版 target=）
)
```

CLI：

```bash
# 按拓扑里每台设备的 capabilities.dataPlaneTarget 分别生成 P4
python -m compiler pipeline path/to/file.pne --topology path/to/topology.json -o ./out

# 可选：强制全部节点同一后端
python -m compiler pipeline path/to/file.pne --topology path/to/topology.json -o ./out --target bmv2
```

See `docs/topology-snapshot-schema.md` and `examples/pne/mvp_demo.pne`.

## PNE With Intent Overlay

`PneParser` now reads `frontend/grammar_pne_intent.lark`, so a single `.pne` file may contain:

- explicit PNE declarations: `service`, `application`, `module`
- an optional top-level `intent { ... }` block

Example:

```pn
module Forwarder() {
  parser {
    ipv4;
  }
  control {
    ;
  }
}

intent {
  route R1 {
    from: prefix({ kind: "cidr", value: "10.0.0.0/8" })
    to: edge-1
    via: core-1, edge-1
    protocol: ip
  }

  policy P1 {
    match: {
      "ipv4.dstAddr": "10.0.0.1"
    }
    action: {
      nextHop: "edge-1"
    }
  }
}
```

### Current lowering behavior

- intent overlays are lowered into `ProgramIR` after explicit PNE declarations are collected
- route lowering uses **protocol/profile adapters** from `semantic/protocol_adapters.py` (`ProtocolAdapter`, `normalize_protocol_name`, registered profiles)
- registered profiles include **`ipv4`** (alias **`ip`**), **`ipv6`**, **`srv6`**, **`ndn`**, **`geo`**, **`powerlink`** (routes rejected; use `determinism` / `schedule`); unknown names fall back to `CustomProtocolAdapter`
- optional surface syntax: `reachability` (same as `route`), `constraints { ... }`, `profile:` (overrides `protocol`), `determinism` / `schedule` blocks
- see `docs/intent-unified-model.md` for the full model
- `prefix(...)` uses `prefix({ kind: "cidr", value: "..." })` for IP; other kinds (e.g. `name`) are used by NDN/GEO-style profiles

Migration policy: `src/lynette2` and `co/example1/lynette-dev` may be removed; the compiler no longer depends on them.
