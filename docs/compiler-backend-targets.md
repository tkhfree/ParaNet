# 编译目标：BMv2 与 Tofino

**默认（one-big-switch）：** 拓扑里每个节点可在 `capabilities.dataPlaneTarget`（或顶层 `dataPlaneTarget`）写 `bmv2` / `tofino` / `stub`；`compile_pipeline` 为 **每个 NodePlanIR** 选对应 `BackendEmitter`。缺省元数据时用 `default_target`（一般为 `bmv2`）。

**全局覆盖：** `compile_pipeline(..., override_target=...)` 或兼容旧参数 `target=...`，以及 CLI `--target`，会 **强制所有节点** 使用同一后端（便于脚本/CI 一键出同质 P4）。

| 取值 | 说明 |
|------|------|
| `bmv2`（常见默认） | 生成 **P4-16 v1model** 完整程序（`V1Switch`），可用开源 `p4c` 编译为 BMv2 `simple_switch` JSON。 |
| `tofino` | 生成 **TNA** 形状的 `parser` / `control` / `deparser`（`#include <tna.p4>`），需 **Intel P4 Studio / Barefoot SDE**；将 `ParanetIngress*` 接入你环境中的 `Pipeline(...)`。 |
| `stub` | 占位注释，用于快速联调。 |

## 语义（两目标一致）

- 按 **NodePlanIR** 上 fragment 的 **order** 在 P4 的 `apply` 前生成注释，标明各 fragment。
- 将 **`intent_route_lookup`**（`protocol: ip` / IPv4）展开为 **`hdr.ipv4.dstAddr` 上的 LPM 表** `ipv4_lpm`，动作为转发到确定性分配的 **egress 端口**（由 intent `to:` 的节点 id 唯一映射）。
- **`entries.json`** 中含 `simple_switch_cli`（BMv2）或部署说明（Tofino）；真机端口需按拓扑再映射。

## BMv2 编译示例

```bash
p4c --target bmv2 --arch v1model program.p4 -o program.json
```

## Tofino 说明

不同 SDE 版本的 **intrinsic metadata** 字段名可能略有差异；若编译报错，请对照本地 `tna.p4` 微调 `ParanetIngress*` 控制块中的 `drop` / `forward` 动作。
