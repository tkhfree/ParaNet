## PNE DSL grammar skill

Use this skill as the source of truth when generating or repairing ParaNet PNE DSL.

### Top-level forms

- A program is a sequence of `service`, `application`, `module`, and `intent` blocks.
- Prefer generating `module ... { ... }` plus an optional `intent { ... }` block.
- `service [Name] { A -> B -> C }` declares a service chain.
- `application Name [using Profile] { ... }` wraps statements in a block.

### Module shape

- `module Name(param_list?) [using Profile] { parser? control }`
- `parser { expr; ... }` is optional.
- `control { statement* }` is required.
- Parameters are `direction? type_ref name`, where direction is `in`, `out`, or `inout`.

### Supported control statements

- Declarations: variable, `map`, `set`, `register`
- `func name(args) { ... }`
- `if (...) { ... } else ...`
- `switch (expr[, expr]*) { case_expr: stmt | default: stmt }`
- `assert(expr);`
- `lhs = expr;`
- `expr;`
- `;`

### Core types and expressions

- `type_ref` is `bit<number>` or a named type.
- Endpoint type refs allow dotted names such as `ipv4.addr`.
- Literals: integers, hex, IPv4, IPv6, strings, booleans.
- Expressions support call, attribute, index, slice, unary ops, arithmetic ops, comparisons, logical ops, and `in`.

### Intent overlay blocks

- `intent { ... }` may contain `network`, `node`, `link`, `route`, `reachability`, `determinism`, `schedule`, `policy`, and `import`.
- `route` and `reachability` share the same body shape.
- Route-like blocks commonly use `from`, `to`, `via`, `protocol`, `profile`, `path`, and `constraints`.
- `profile` and `protocol` are aliases for profile selection; if both are present, prefer `profile`.
- Normalize `ip` requests to the `ipv4` profile while preserving user intent.
- Endpoint selectors may be bare identifiers, `prefix({...})`, or `region("...")`.
- `link` endpoints use `endpoints: [nodeA, nodeB]`.
- `policy` supports `match: { ... }` and `action: { ... }`.

### Generation rules

- Only emit constructs defined above. Do not invent unsupported keywords.
- Reuse topology node IDs exactly when the topology context provides them.
- When details are missing, ask for clarification instead of fabricating topology facts.
- Produce syntactically valid PNE first; keep explanations separate from the DSL payload.

### Minimal valid scaffold

```paranet
module GeneratedAgent() {
  control {
    ;
  }
}

intent {
}
```
