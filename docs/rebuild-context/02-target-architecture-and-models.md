# 新项目目标架构与模型草案

## 1. 设计目标

这个文档不是描述当前 Lynette 已经实现了什么，而是描述在一个新项目中，如何更稳健地重建它的核心能力。

目标是同时满足四件事：

- 尽量兼容现有 PNE 思想和主要语义
- 让编译器各阶段职责清晰
- 让 schema 和内部 IR 可以被测试、校验、演进
- 让多后端输出和后续优化有稳定扩展点

## 2. 推荐的总体架构

建议新项目采用如下的分层结构：

1. `frontend`
   负责源码输入、预处理、include 解析、语法分析、AST 构建。
2. `semantic`
   负责符号表、语义检查、类型别名和常量收集、AST 到 Typed IR 转换。
3. `ir`
   统一定义程序级、片段级、节点级中间表示。
4. `lowering`
   把应用和模块逻辑降低为 fragment。
5. `placement`
   按服务路径和节点资源做 fragment 放置。
6. `backend`
   将节点级计划映射到不同 P4 架构。
7. `runtime`
   负责产物组织和可选部署。
8. `cli`
   负责命令和参数入口，不负责业务逻辑。

## 3. 推荐的模块边界

### 3.1 `frontend`

职责：

- 读取 `.pne` 文件
- 解析 `#include`
- 解析 `.domain`
- 生成 AST
- 产出带源码位置信息的诊断

建议：

- 不再使用 `">-<"` 替换双引号
- 单独实现预处理器
- 所有 AST 节点都保留 `source_file / line / column / span`

### 3.2 `semantic`

职责：

- 建立类型别名和常量表
- 收集 `service / application / module`
- 解析参数和作用域
- 检查未定义符号、参数数量、类型不匹配
- AST -> Typed IR

建议：

- 不要在代码生成阶段再补做大量语义判断
- 把“语义合法性”尽量前移到这一层

### 3.3 `ir`

职责：

- 定义编译器内部稳定 contract
- 隔离 frontend 和 backend
- 支持调试输出、测试和序列化

建议：

- `ProgramIR`、`FragmentIR`、`NodePlanIR` 三层明确分开
- 所有对象尽量用 `dataclass` 或 Pydantic 模型表示

### 3.4 `lowering`

职责：

- 将应用和模块 body 切分成 fragment
- 计算 fragment 的输入输出依赖
- 计算 fragment 的资源成本
- 对可优化结构做 lowering

建议：

- 当前 Lynette 的单表优化思路要保留
- fragment 必须是显式对象，而不是一组临时文件

### 3.5 `placement`

职责：

- 根据服务路径和节点资源预算分配 fragment
- 确定每个节点需要哪些 parser/header/control/entry

建议：

- 第一版实现 `greedy`
- 第二版可以扩展 `balanced`
- 后续再考虑 `ILP / CP-SAT`

### 3.6 `backend`

职责：

- 生成节点级 P4 程序
- 输出对应的 entry 文件
- 屏蔽不同后端的符号差异

建议：

- 把 `v1model` 和 `TNA` 显式建成两个 backend adapter
- 不再让 `output.py` 承担“模板替换 + 逻辑判断 + 文件组织”的全部职责

## 4. 推荐 CLI 设计

建议新项目使用显式子命令，而不是把所有模式都堆进一个命令。

```bash
lynette compile --service service.json --path path.json --out dist/
lynette path generate --service service.json --topology topology.json --out path.json
lynette check --service service.json
lynette explain --main input/Alice_main.pne
lynette deploy --artifacts dist/ --inventory devices.json
```

这样可以让职责更清楚：

- `compile`
  执行编译
- `path generate`
  生成路径
- `check`
  只做检查
- `explain`
  用于调试 IR 或编译阶段
- `deploy`
  做可选下发

## 5. 配置 Schema 建议

下面是推荐的新项目配置模型。

### 5.1 `service.json`

建议只表达“程序和服务逻辑”，避免混入过多设备细节。

```json
{
  "version": "2.0",
  "programs": [
    {
      "program_id": "alice",
      "main_file": "input/Alice_main.pne",
      "services": [
        {
          "service_id": "geo-routing",
          "applications": ["Router"],
          "hosts": [
            {
              "device_id": "s1",
              "attachment_ports": { "h1": 21 }
            },
            {
              "device_id": "s2",
              "attachment_ports": { "h2": 22 }
            }
          ],
          "constraints": {
            "preferred_backend": "auto",
            "latency_budget_us": null
          }
        }
      ]
    }
  ]
}
```

### 5.2 `topology.json`

建议显式表达设备能力，而不是在路径生成器里隐式猜测。

```json
{
  "version": "2.0",
  "devices": [
    {
      "device_id": "s1",
      "mgmt_ip": "192.168.0.1",
      "backend": "v1model",
      "capabilities": {
        "table_capacity": 6,
        "register_capacity": 1024,
        "supports_checksum": true
      }
    }
  ],
  "links": [
    {
      "src_device": "s1",
      "src_port": 2,
      "dst_device": "s2",
      "dst_port": 1,
      "bidirectional": true
    }
  ]
}
```

### 5.3 `path.json`

建议路径文件只表达“服务路径和每节点预算”，不要兼任拓扑总表。

```json
{
  "version": "2.0",
  "service_paths": [
    {
      "service_id": "geo-routing",
      "nodes": [
        {
          "device_id": "s1",
          "next_hop": {
            "device_id": "s2",
            "egress_port": 2
          },
          "placement_budget": {
            "tables": 6
          }
        },
        {
          "device_id": "s2",
          "next_hop": null,
          "placement_budget": {
            "tables": 8
          }
        }
      ]
    }
  ]
}
```

## 6. 内部 IR 建模建议

### 6.1 总体原则

新项目内部 IR 建议分三层：

- `ProgramIR`
  语言语义层
- `FragmentIR`
  lowering 结果层
- `NodePlanIR`
  placement 结果层

### 6.2 `dataclass` 草案

下面是推荐的最小可行建模。

```python
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal


BackendName = Literal["v1model", "tna"]
FragmentRole = Literal["head", "body", "tail"]
ParamDirection = Literal["in", "out", "inout"]


@dataclass
class SourceSpan:
    file: str
    line: int
    column: int
    end_line: int
    end_column: int


@dataclass
class TypeRef:
    name: str
    width: int | None = None


@dataclass
class ParamIR:
    name: str
    direction: ParamDirection
    type_ref: TypeRef


@dataclass
class ConditionIR:
    kind: Literal["compare", "check", "isvalid", "logical"]
    op: str | None = None
    left: list[str] = field(default_factory=list)
    right: list[str] = field(default_factory=list)


@dataclass
class InstructionIR:
    kind: str
    data: dict
    span: SourceSpan | None = None


@dataclass
class MapDeclIR:
    name: str
    key_types: list[TypeRef]
    value_types: list[TypeRef]
    size: int | None = None
    entries: list[list[str]] = field(default_factory=list)


@dataclass
class SetDeclIR:
    name: str
    key_types: list[TypeRef]
    entries: list[list[str]] = field(default_factory=list)


@dataclass
class RegisterDeclIR:
    name: str
    value_type: TypeRef
    size: int | None = None


@dataclass
class FunctionIR:
    name: str
    params: list[ParamIR] = field(default_factory=list)
    body: list[InstructionIR] = field(default_factory=list)


@dataclass
class ModuleIR:
    name: str
    params: list[ParamIR] = field(default_factory=list)
    parser_headers: list[str] = field(default_factory=list)
    local_vars: dict[str, TypeRef] = field(default_factory=dict)
    maps: dict[str, MapDeclIR] = field(default_factory=dict)
    sets: dict[str, SetDeclIR] = field(default_factory=dict)
    registers: dict[str, RegisterDeclIR] = field(default_factory=dict)
    functions: dict[str, FunctionIR] = field(default_factory=dict)
    body: list[InstructionIR] = field(default_factory=list)


@dataclass
class ApplicationIR:
    name: str
    parser_name: str | None = None
    local_vars: dict[str, TypeRef] = field(default_factory=dict)
    body: list[InstructionIR] = field(default_factory=list)


@dataclass
class ServiceIR:
    name: str
    application_chain: list[str] = field(default_factory=list)


@dataclass
class ProgramIR:
    services: dict[str, ServiceIR] = field(default_factory=dict)
    applications: dict[str, ApplicationIR] = field(default_factory=dict)
    modules: dict[str, ModuleIR] = field(default_factory=dict)
    type_aliases: dict[str, TypeRef] = field(default_factory=dict)
    constants: dict[str, str] = field(default_factory=dict)


@dataclass
class ResourceCost:
    table_count: int = 0
    register_count: int = 0
    temp_var_count: int = 0


@dataclass
class TableIR:
    name: str
    keys: list[str] = field(default_factory=list)
    actions: list[str] = field(default_factory=list)
    default_action: str | None = None


@dataclass
class ActionIR:
    name: str
    params: list[ParamIR] = field(default_factory=list)
    body_lines: list[str] = field(default_factory=list)


@dataclass
class EntryIR:
    table: str
    match: dict[str, list[str]] = field(default_factory=dict)
    action_name: str = ""
    action_params: dict[str, list[str]] = field(default_factory=dict)


@dataclass
class FragmentIR:
    fragment_id: str
    owner_service: str
    owner_application: str
    sequence_index: int
    role: FragmentRole
    inputs: list[str] = field(default_factory=list)
    outputs: list[str] = field(default_factory=list)
    resources: ResourceCost = field(default_factory=ResourceCost)
    tables: list[TableIR] = field(default_factory=list)
    actions: list[ActionIR] = field(default_factory=list)
    entries: list[EntryIR] = field(default_factory=list)
    control_lines: list[str] = field(default_factory=list)
    dependencies: list[str] = field(default_factory=list)
    co_locate_with: list[str] = field(default_factory=list)


@dataclass
class NodeBudget:
    tables: int


@dataclass
class NextHopIR:
    device_id: str
    egress_port: int


@dataclass
class NodePathIR:
    device_id: str
    backend: BackendName
    mgmt_ip: str
    budget: NodeBudget
    next_hop: NextHopIR | None = None


@dataclass
class ServicePathIR:
    service_id: str
    nodes: list[NodePathIR] = field(default_factory=list)


@dataclass
class NodePlanIR:
    node_id: str
    backend: BackendName
    mgmt_ip: str
    fragments: list[str] = field(default_factory=list)
    headers_used: list[str] = field(default_factory=list)
    parser_states_used: list[str] = field(default_factory=list)
    tables: list[TableIR] = field(default_factory=list)
    actions: list[ActionIR] = field(default_factory=list)
    entries: list[EntryIR] = field(default_factory=list)
    control_lines: list[str] = field(default_factory=list)


@dataclass
class CompilationPlanIR:
    service_paths: dict[str, ServicePathIR] = field(default_factory=dict)
    node_plans: dict[str, NodePlanIR] = field(default_factory=dict)
```

### 6.3 `Pydantic` 配置模型草案

如果新项目会频繁加载和校验 JSON 文件，建议配置层使用 Pydantic。

```python
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, IPvAnyAddress, PositiveInt


class HostAttachmentModel(BaseModel):
    device_id: str
    attachment_ports: dict[str, PositiveInt] = Field(default_factory=dict)


class ServiceConstraintModel(BaseModel):
    preferred_backend: Literal["auto", "v1model", "tna"] = "auto"
    latency_budget_us: int | None = None


class ServiceModel(BaseModel):
    service_id: str
    applications: list[str]
    hosts: list[HostAttachmentModel]
    constraints: ServiceConstraintModel = Field(default_factory=ServiceConstraintModel)


class ProgramModel(BaseModel):
    program_id: str
    main_file: str
    services: list[ServiceModel]


class ServiceConfigModel(BaseModel):
    version: str = "2.0"
    programs: list[ProgramModel]


class DeviceCapabilitiesModel(BaseModel):
    table_capacity: PositiveInt
    register_capacity: PositiveInt | None = None
    supports_checksum: bool = True


class DeviceModel(BaseModel):
    device_id: str
    mgmt_ip: IPvAnyAddress
    backend: Literal["v1model", "tna"]
    capabilities: DeviceCapabilitiesModel


class LinkModel(BaseModel):
    src_device: str
    src_port: PositiveInt
    dst_device: str
    dst_port: PositiveInt
    bidirectional: bool = True


class TopologyConfigModel(BaseModel):
    version: str = "2.0"
    devices: list[DeviceModel]
    links: list[LinkModel]


class PlacementBudgetModel(BaseModel):
    tables: PositiveInt


class NextHopModel(BaseModel):
    device_id: str
    egress_port: PositiveInt


class PathNodeModel(BaseModel):
    device_id: str
    next_hop: NextHopModel | None = None
    placement_budget: PlacementBudgetModel


class ServicePathModel(BaseModel):
    service_id: str
    nodes: list[PathNodeModel]


class PathConfigModel(BaseModel):
    version: str = "2.0"
    service_paths: list[ServicePathModel]
```

## 7. Placement 层接口建议

当前项目的放置逻辑耦合在 `aggregate.py` 中。新项目建议抽象成接口。

```python
from typing import Protocol


class PlacementStrategy(Protocol):
    def place(
        self,
        program: ProgramIR,
        fragments: list[FragmentIR],
        service_paths: dict[str, ServicePathIR],
    ) -> CompilationPlanIR:
        ...
```

建议先实现：

- `GreedyPlacementStrategy`

后续再扩展：

- `BalancedPlacementStrategy`
- `ConstraintPlacementStrategy`

## 8. Backend 层接口建议

当前 Lynette 的后端逻辑主要混在 `output.py`。新项目应显式抽象。

```python
from typing import Protocol


class BackendEmitter(Protocol):
    name: str

    def emit_headers(self, node_plan: NodePlanIR) -> str:
        ...

    def emit_parser(self, node_plan: NodePlanIR) -> str:
        ...

    def emit_control(self, node_plan: NodePlanIR) -> str:
        ...

    def emit_deparser(self, node_plan: NodePlanIR) -> str:
        ...

    def emit_entries(self, node_plan: NodePlanIR) -> str:
        ...
```

建议至少提供：

- `V1ModelBackendEmitter`
- `TnaBackendEmitter`

## 9. 推荐的工件组织方式

建议编译产物除了实际文件，还要生成 manifest，方便部署和测试系统消费。

示例：

```json
{
  "build_id": "2026-03-06T12:00:00Z",
  "artifacts": [
    {
      "node_id": "s1",
      "backend": "v1model",
      "p4_file": "dist/s1.p4",
      "entry_file": "dist/s1_entry.json"
    },
    {
      "node_id": "s2",
      "backend": "tna",
      "p4_file": "dist/s2.p4",
      "entry_file": "dist/s2_entry.py"
    }
  ]
}
```

## 10. 对新项目的直接建议

如果你的目标是“在新项目中可持续地重建 Lynette”，建议遵循以下原则：

- 语法兼容优先于代码兼容
- IR 稳定性优先于临时输出便利
- schema 校验优先于隐式约定
- 后端抽象优先于字符串替换
- 先把真实支持的子集做扎实，再扩 grammar

一句话总结：

新项目应该保留 Lynette 的“编译骨架与语义目标”，但应当用“强类型模型、显式 schema、可插拔 placement 和 backend 接口”重建工程本体。
