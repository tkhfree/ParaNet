# 拓扑快照（topology_snapshot）契约

编译管线通过 `compile_pne_text_to_program_ir(..., topology_snapshot=...)` 注入拓扑，并写入 `ProgramIR.metadata["topology"]`。本文冻结 **MVP v0** 所需字段，与前端 [`Topology`](frontend/src/model/topology.ts) 对齐并可扩展。

## 顶层形状

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 可选，拓扑 ID |
| `name` | string | 可选，显示名 |
| `nodes` | array | **必填**（校验时）；节点列表 |
| `links` | array | 可选；链路列表 |

## 节点 `nodes[]`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | **必填**；与 Intent 中 `to` / `via` 等引用的标识一致 |
| `name` | string | 可选 |
| `type` | string | 可选；设备类型标签 |
| `capabilities` | object | 可选；见下 |

### `capabilities`（MVP 最小集）

| 字段 | 类型 | 说明 |
|------|------|------|
| `parserRoots` | string[] | 可选；parser 根头名（如 `ipv4`、`ipv6`），与 `protocol_adapters` 校验对齐时可用 |
| `profiles` | string[] | 可选；支持的剖面名（如 `ipv4`、`srv6`） |
| `dataPlaneTarget` | string | 可选；**数据面编译目标**：`bmv2`（v1model）、`tofino`（TNA）、`stub`（占位）。缺省为 `bmv2`。编译管线按 **每个节点** 的该字段选择 `BackendEmitter`，实现 one-big-switch 下「每台设备一种 P4 形态」。前端拓扑画布在创建设备时可写入；亦可在顶层使用 `dataPlaneTarget`（与 `capabilities.dataPlaneTarget` 等价，见 `compiler/placement/node_target.py`）。 |

## 链路 `links[]`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 可选 |
| `source` | string | 源节点 `id` |
| `target` | string | 宿节点 `id` |

## MVP v0 分解规则（Fragment）

与 [Intent 统一模型](./intent-unified-model.md) 配合，**v0** 固定为：

1. **每个 `module` 对应一个 `FragmentIR`**，`fragment_id` = `module:<ModuleName>`，包含该 `ModuleIR` 的 `body` 指令序列（含 overlay 写入该模块的 intent 指令）。
2. **每个非空 `application` 对应一个 `FragmentIR**，`fragment_id` = `application:<AppName>`。
3. Service 链 **不单独成段**（v0）；后续可改为按 service 切分。

## 放置策略 v0（Placement）

- 输入：`FragmentIR` 列表 + 拓扑快照。
- 若 `nodes` 非空：按 **轮询** 将 fragment 分配到 `nodes[i % N].id`。
- 若 `nodes` 为空：所有 fragment 挂到单一占位节点 `default`。

详见编译器 [`compiler/placement/planner.py`](../compiler/placement/planner.py)。
