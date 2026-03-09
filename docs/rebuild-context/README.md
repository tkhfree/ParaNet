# Lynette 重构上下文文档

这组文档用于在另一个项目中重新设计和实现 Lynette。目标不是逐行复刻当前工程，而是帮助新项目快速理解：

- 这个项目当前到底做了什么
- 当前源码真实支持了哪些能力
- 哪些设计值得保留
- 哪些实现应当在新工程中重写
- 新工程的推荐模块边界、数据模型与迭代路线

## 文档目录

### `01-current-project-summary.md`

当前项目的完整事实总结，覆盖：

- 项目定位
- 编译主链
- 目录结构
- 对外接口
- PNE 语言语法
- 输入输出文件
- 实现原理
- 已知限制

### `02-target-architecture-and-models.md`

面向新项目的推荐设计，覆盖：

- 现代化编译器分层
- 模块边界与职责
- 推荐 CLI 设计
- `service/topology/path` schema
- `ProgramIR/FragmentIR/NodePlanIR` 建模建议
- `dataclass` 与 `Pydantic` 草案

### `03-mvp-rebuild-roadmap.md`

新项目的落地实施路线图，覆盖：

- MVP 范围裁剪
- 分阶段开发顺序
- 每阶段交付物
- 测试策略
- 风险点
- 推荐里程碑

## 使用建议

建议阅读顺序：

1. 先读 `01-current-project-summary.md`，确认当前工程的真实边界。
2. 再读 `02-target-architecture-and-models.md`，作为新项目的技术设计输入。
3. 最后读 `03-mvp-rebuild-roadmap.md`，按阶段推进实现。

## 文档定位

这些文档分为两类信息：

- `事实层`：严格基于当前仓库源码整理得出。
- `建议层`：为新项目重构提出的改进设计，不等于当前仓库已经实现。

在新项目中，建议把当前仓库当作“语义原型和编译流程样本”，而不是可直接照搬的工程模板。
