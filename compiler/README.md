# Unified Compiler Layout

This folder is the ParaNet unified compiler pipeline.

## Directory Structure

- `frontend/`: PNE and Intent dual-DSL parsing (no lynette2 dependency)
  - `preprocessor.py`: include/.domain expansion
  - `pne_ast.py`, `intent_ast.py`: AST node definitions
  - `pne_parser.py`, `intent_parser.py`: Lark-based parsers
  - `grammar_pne.lark`, `grammar_intent.lark`: grammars
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

Migration policy: `src/lynette2` and `co/example1/lynette-dev` may be removed; the compiler no longer depends on them.
