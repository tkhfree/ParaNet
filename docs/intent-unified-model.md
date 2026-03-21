# Intent 统一模型与剖面（Profile）

本文描述 ParaNet PNE 中 `intent { ... }` 的**稳定句型**、**剖面标识**与**扩展策略**，与编译器实现（`compiler/semantic/protocol_adapters.py`、`collector_pne_intent.py`）对齐。

## 设计原则

1. **表面句型少而稳**：拓扑、可达性、策略、确定性调度等；不因新协议复制顶层语法。
2. **剖面承载差异**：解析需求、键空间、合法动作由 **Profile / ProtocolAdapter** 注册表描述；新协议 = 新适配器 + 可选元数据。
3. **向后兼容**：既有 `route` / `protocol: ip` 继续有效；`reachability` 与 `route` 语义相同。

## 句型（Surface Syntax）

| 句型 | 说明 |
|------|------|
| `network` / `node` / `link` | 拓扑与资源（含嵌套） |
| `route` | 可达性意图（L3/L4 类剖面） |
| `reachability` | 与 `route` **等价**，AST 均为 `RouteDefNode` |
| `policy` | 分类 + 动作 |
| `constraints { ... }` | 可选，出现在 `route` / `reachability` 体内，作为 `constraints` 属性（对象）供适配器校验 |
| `determinism` | 确定性网络域（如 Powerlink 类周期/主站） |
| `schedule` | 节点时隙/调度片段 |

## 剖面标识：`protocol` 与 `profile`

- **`protocol:`** 与 **`profile:`** 均表示剖面名称；若同时出现，**`profile` 优先**。
- **别名（规范化）**：
  - `ip` → `ipv4`（路由表存储名仍为 `ip_route_table`，与既有用例兼容）

## 已注册剖面（首版）

| 规范化名 | 说明 | 备注 |
|----------|------|------|
| `ipv4` | IPv4 前缀路由 | 别名 `ip` |
| `ipv6` | IPv6 前缀路由 | parser 需含 `ipv6` 根头 |
| `srv6` | SRv6（IPv6 + SRH 语义） | 继承 IPv6 校验；可选 `path:`（SID 列表） |
| `ndn` | 命名数据：前缀 `kind` 可为 `name` 等 | 通用前缀 lowering |
| `geo` | 地理/区域：`region(...)` 或 `prefix({ kind: "region", ... })` | |
| `powerlink` | 工业实时：**不推荐**在 `route` 中描述；请使用 `determinism` / `schedule` | `route` 会给出诊断 |

未知剖面名仍可走 **CustomProtocolAdapter**（原型模式）；生产环境建议显式注册。

## Endpoint 与 prefix

- `prefix({ kind: "cidr", value: "..." })`：IPv4/IPv6 CIDR。
- `prefix({ kind: "name", value: "..." })`：NDN 名字前缀。
- `region("APAC")`：`EndpointSpecNode` kind `region`。
- `to` / `from` 可为节点标识符或上述构造。

## 编译管线（概念）

```
Intent AST → 规范化剖面名 → ProtocolAdapter.validate_route → lower_route / lower_policy
          → ProgramIR（InstructionIR、map 等）
```

更低阶段（FragmentIR / Placement）见 [compiler/README.md](../compiler/README.md)。

## 相关文档

- [DSL 参考](./dsl-reference.md)
- [拓扑快照（topology_snapshot）契约](./topology-snapshot-schema.md)（编译注入、节点能力、Fragment/Placement v0 规则）
- [编译器 README](../compiler/README.md)
