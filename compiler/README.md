# Unified Compiler Layout

This folder is the ParaNet unified compiler pipeline.

## Directory Structure

- `frontend/`: PNE and Intent dual-DSL parsing (no lynette2 dependency)
  - `preprocessor.py`: include/.domain expansion
  - `pne_ast.py`, `intent_ast.py`: AST node definitions
  - `pne_parser.py`, `intent_parser.py`: Lark-based parsers
  - `grammar_pne.lark`, `grammar_pne_intent.lark`, `grammar_intent.lark`: grammars
- `semantic/`: AST → ProgramIR / IntentIR collection
  - `collector_pne.py`: PNE AST → ProgramIR
  - `collector_intent.py`: Intent AST → ProgramIR (placeholder)
  - `validator.py`, `symbols.py`: validation placeholders
- `ir/`: IR definitions (common, program, instructions, fragment, node_plan, intent, resources, capabilities)
- `lowering/`: ProgramIR → FragmentIR (placeholder)
- `placement/`: FragmentIR → NodePlanIR (placeholder)
- `backend/`: NodePlanIR → P4/entry emitters (placeholder)
- `runtime/`: manifest, artifacts, deploy (placeholder)
- `cli/`: command-line entrypoint (placeholder)

## Usage

```python
from compiler import get_pne_parser, compile_pne_to_program_ir

parser = get_pne_parser()
result = parser.parse_text("service [s1] { a -> b } application a { }")
program = compile_pne_to_program_ir(Path("example.pne"))
```

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
- route lowering uses protocol adapters from `semantic/protocol_adapters.py`
- the first implemented adapter is `ip`
- unsupported protocols currently return diagnostics instead of auto-generating parser bindings
- `prefix(...)` uses the scheme `prefix({ kind: "cidr", value: "..." })`

Migration policy: `src/lynette2` and `co/example1/lynette-dev` may be removed; the compiler no longer depends on them.
