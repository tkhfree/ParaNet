# PNE Grammar Support Matrix

This matrix freezes the first supported surface for the standalone `lynette2`
frontend. It is derived from the demo samples and the rebuild documents.

## Tier 1: end-to-end required

These constructs must parse, build AST, and lower into `ProgramIR`.

- `#include` from local file and `.domain`
- `service[...] { ... }`
- `application Name using Parser { ... }`
- `module Name(...) { parser { ... } control { ... } }`
- `if / else if / else`
- assignments
- `Foo.apply(...)`
- `map` declarations
- primitive calls: `drop()`, `nop()`
- `in` conditions
- `isValid()` checks

## Tier 2: expanded grammar in first rebuild

These constructs must parse, build AST, and be represented in `ProgramIR`.

- `switch`
- `set`
- `static bit<...> reg[size]`
- `static map<...>[size] name`
- `func`
- `assert`
- tuple assignment targets
- tuple switch keys
- generic method calls such as `hdr.vlan_tag.setValid()`

## Tier 3: expression completeness

These constructs must parse and round-trip through AST and `ProgramIR`.

- logical `&&` and `||`
- unary `!`, `-`, `~`
- arithmetic `+`, `-`, `*`, `/`, `%`
- indexed expressions `foo[bar]`
- bit slices `foo[9:0]`
- hex literals such as `0x0A000001`
- IPv4 and IPv6 literals

## Explicitly out of scope for this pass

These constructs are intentionally not accepted yet and must emit diagnostics if
encountered during semantic analysis or parsing work that reaches them.

- `for`
- `while`
- backend-specific header and parser definition files
- full deployment and backend emission

## Frozen sample set

- `examples/pne/alice_router_main.pne`
- `examples/pne/include/router_modules.pne`
- `examples/pne/extended_features_main.pne`
- `examples/pne/include/extended.domain`
- `examples/pne/include/extended_modules.pne`
