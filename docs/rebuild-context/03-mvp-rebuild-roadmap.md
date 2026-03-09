# 新项目 MVP 重构路线图

## 1. 路线图目标

这个路线图的目标不是一次性把当前 Lynette 的所有语法和后端能力完整复刻，而是帮助新项目以最低风险、最短闭环、最清晰模块边界的方式，逐步重建它最核心的编译能力。

建议总体策略：

- 先重建“最小可跑通闭环”
- 再补基础设施
- 再扩语法和优化
- 最后扩多后端和部署能力

## 2. 设计原则

### 原则 1：先做真实闭环，不做假全量

当前仓库存在“grammar 声明超前于 pass 实现”的情况。新项目不要一开始就把所有 grammar 中出现的特性都标记为支持。

建议第一版只支持：

- `include`
- `application`
- `module`
- `parser`
- `control`
- `map`
- `if`
- `ins_assign`
- `ins_call`
- `drop`

### 原则 2：先用 Typed IR 统一约束

不要先写字符串输出，再回头补 IR。应该先定义：

- `ProgramIR`
- `FragmentIR`
- `NodePlanIR`

之后所有 pass 都以这些结构为输入输出。

### 原则 3：配置和 IR 都做显式 schema

新项目从第一天就要有：

- 输入 schema
- IR dump 能力
- 明确 diagnostics

### 原则 4：每阶段都要有可验证产物

每个阶段结束时都应具备：

- 代码产物
- 样例
- 测试
- 已知不支持范围

## 3. 阶段划分

建议把重构分成 6 个阶段。

## 4. Phase 0：准备阶段

目标：

- 建好新项目骨架
- 固化目录结构
- 先把配置模型和测试框架搭起来

### 交付物

- `pyproject.toml`
- `src/lynette2/`
- `tests/`
- CI 基础配置
- `ServiceConfigModel / TopologyConfigModel / PathConfigModel`

### 本阶段任务

1. 搭建 Python 包结构。
2. 引入 `pydantic`、`pytest`、`typing-extensions`。
3. 定义基础 schema 模型。
4. 建立 examples 和 golden test 目录。
5. 约定日志和诊断格式。

### 验收标准

- 能成功加载并校验最小 `service/topology/path` JSON
- 测试框架可运行
- 基础项目结构稳定

## 5. Phase 1：最小编译闭环

目标：

- 实现最小 PNE 子集的编译流程
- 跑通 `PNE -> AST -> ProgramIR -> FragmentIR -> NodePlanIR -> v1model P4`

### 支持范围

- `#include`
- `application`
- `module`
- `parser`
- `control`
- `map`
- `if`
- `Foo.apply()`
- `a = b`
- `drop()`

### 本阶段任务

1. 实现预处理器：
   处理 `#include` 和 `.domain`，但不再使用字符串替换 hack。
2. 实现语法分析：
   基于 Lark 或其他 parser 工具构建 AST。
3. 实现 `ProgramIR`：
   收集 `application / module / service`。
4. 实现最小 lowering：
   将应用 body 降低成 fragment。
5. 实现最小 placement：
   基于给定 path 做 greedy 放置。
6. 实现 `v1model` 后端：
   输出最小可编译 P4。

### 交付物

- 一个最小示例可编译
- 一个最小 `.p4` 文件
- 一个最小 entry 文件
- 一个 IR dump 文件

### 验收标准

- 至少一个样例端到端通过
- `compile` 命令可运行
- 可以输出 `ProgramIR`、`FragmentIR`、`NodePlanIR`

## 6. Phase 2：语义与错误处理加强

目标：

- 让编译器从“能跑”升级到“可调试、可定位、可扩展”

### 本阶段任务

1. 为 AST 节点附加 `SourceSpan`。
2. 建立 diagnostics 体系：
   语法错误、语义错误、schema 错误、backend 错误。
3. 补齐符号表：
   模块定义、变量、函数、类型别名、常量。
4. 加入基础语义检查：
   未定义模块、参数数量不匹配、非法引用、重复定义。
5. 加入 `check` 子命令。

### 交付物

- 可读错误信息
- 统一错误码或错误分类
- `lynette check`

### 验收标准

- 非法输入能输出准确文件位置
- IR 阶段错误不再使用 `print + exit`
- 测试覆盖常见错误场景

## 7. Phase 3：扩语法与 lowering

目标：

- 支持当前 Lynette 真实较常用的语言能力

### 推荐支持顺序

1. `switch`
2. `set`
3. `register`
4. `assert`
5. `func`
6. `ins_cul`
7. 更完整的表达式

### 本阶段任务

1. 扩展 AST 节点类型。
2. 扩展 Typed IR。
3. 为 `if/switch` 实现单表优化。
4. 为 `map/set` 统一 entry 生成逻辑。
5. 补齐函数调用和作用域模型。

### 交付物

- 扩展语法样例
- lowering 测试用例
- 优化前后 IR 对比输出

### 验收标准

- 至少覆盖当前 Lynette 常用样例中的核心语法
- 单表优化能稳定工作
- `switch` 和 `if` 行为一致可测

## 8. Phase 4：parser/header/deparser 裁剪

目标：

- 重建当前 Lynette 最有特点的“按节点裁剪协议处理逻辑”能力

### 本阶段任务

1. 把 header、struct、parser、deparser 建成显式 IR。
2. 收集 fragment 对 header 字段的读写依赖。
3. 计算节点实际使用的 header 集合。
4. 基于依赖裁剪 parser 状态树。
5. 重建节点级 header/parser/deparser。

### 交付物

- `HeaderIR`
- `ParserIR`
- 节点级裁剪结果可视化

### 验收标准

- 不同节点输出的 parser/header 能随 fragment 使用情况变化
- parser 裁剪逻辑可单测

## 9. Phase 5：多后端与产物体系

目标：

- 支持多个 P4 后端
- 统一 artifact 组织和部署输入

### 本阶段任务

1. 抽象 `BackendEmitter` 接口。
2. 实现 `v1model` backend。
3. 实现 `tna` backend。
4. 加入 `artifact_manifest.json`。
5. 为不同后端生成对应 entry 格式。

### 交付物

- `V1ModelBackendEmitter`
- `TnaBackendEmitter`
- manifest 文件
- 按节点输出产物目录

### 验收标准

- 同一 `NodePlanIR` 可切换不同 backend 输出
- entry 生成与 backend 绑定明确

## 10. Phase 6：部署与工程化

目标：

- 从“编译器原型”升级为“可交付工程”

### 本阶段任务

1. 抽象部署器接口。
2. 将 TCP 下发改为可插拔 transport。
3. 支持 dry-run 部署。
4. 记录构建日志、产物 manifest、部署结果。
5. 完善文档和示例。

### 交付物

- `deploy` 命令
- dry-run 模式
- 部署报告

### 验收标准

- 不同部署方式不影响编译主链
- 部署失败不会污染编译结果

## 11. 建议的文件落地顺序

如果从零开始实现，建议按下面的文件顺序推进。

### 第一批文件

- `config/service_schema.py`
- `config/topology_schema.py`
- `config/path_schema.py`
- `ir/program.py`
- `cli/main.py`

### 第二批文件

- `frontend/preprocessor.py`
- `frontend/parser.py`
- `frontend/ast.py`
- `semantic/collector.py`
- `semantic/symbols.py`

### 第三批文件

- `lowering/fragment_builder.py`
- `placement/greedy.py`
- `backend/v1model.py`
- `app.py`

### 第四批文件

- `semantic/validator.py`
- `lowering/table_optimizer.py`
- `backend/tna.py`
- `runtime/deploy.py`

## 12. 测试策略

新项目必须把测试设计当成主工程的一部分。

### 12.1 单元测试

覆盖：

- include 解析
- AST 构建
- schema 校验
- 语义检查
- lowering
- placement
- backend emission

### 12.2 Golden Tests

建议建立：

- `input.pne`
- `service.json`
- `topology.json`
- `path.json`
- `expected_program_ir.json`
- `expected_fragment_ir.json`
- `expected_node_plan.json`
- `expected_s1.p4`

### 12.3 集成测试

至少覆盖：

- 单模块单服务
- 多模块单服务
- 多节点路径
- 不同 backend
- 错误输入

## 13. 关键风险与对策

### 风险 1：语法支持范围失控

表现：

- grammar 写得很多，但 pass 跟不上

对策：

- 给每个语法节点建立“支持矩阵”
- 未支持能力在 semantic 阶段明确报错

### 风险 2：IR 设计过弱

表现：

- backend 和 lowering 直接依赖 AST

对策：

- 在 Phase 1 就把 `ProgramIR/FragmentIR/NodePlanIR` 定稳

### 风险 3：placement 与 backend 耦合

表现：

- 放置逻辑依赖具体后端字段

对策：

- 放置层只关心资源和顺序，不关心具体 P4 字段名

### 风险 4：测试不足导致重构失真

表现：

- 新项目能跑，但和旧语义不一致

对策：

- 建立最小样例 golden tests
- 为关键示例记录旧项目预期产物

## 14. 推荐里程碑

### 里程碑 A：两周可演示

范围：

- Phase 0 + Phase 1

结果：

- 单样例可编译成 `v1model` P4

### 里程碑 B：一个月可内部试用

范围：

- Phase 2 + Phase 3 前半

结果：

- 语义检查更完整
- 支持 `switch/set/reg`

### 里程碑 C：两个月可对照迁移

范围：

- Phase 4 + Phase 5

结果：

- 节点级裁剪
- 多 backend 输出

### 里程碑 D：工程交付

范围：

- Phase 6

结果：

- 具备部署、文档、回归测试和 artifact manifest

## 15. 最终建议

如果只能给一个实施建议，那就是：

**先把“最小 PNE 子集 + Typed IR + fragment lowering + greedy placement + v1model backend”做成端到端闭环，再开始追求语法广度和多后端能力。**

这样可以避免新项目重演旧工程中“语法写得很大，真正稳定支持的路径却很窄”的问题。
