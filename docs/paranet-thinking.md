# Plan: Unified Network Protocol YAML Schema Design

## Context

利用 LLM 根据用网场景自动生成自定义网络协议规范（基于 802.3，从网络层开始自定义）。通过设计一套 YAML JSON Schema，让 LLM 分三轮生成拓扑、控制面、数据面三个 YAML 文件，再由转换程序拆解为 ParaNet 编译器可消费的输入（topology JSON + PNE text），最终编译出 P4 程序和 ONOS 配置。

目标场景：NDN 边缘视频缓存网络。

## 产出文件结构

```
D:\code\sysdesign\
├── schema/
│   ├── topology.schema.json          # 平面1：拓扑定义
│   ├── control-plane.schema.json     # 平面2：控制面定义
│   ├── data-plane.schema.json        # 平面3：数据面定义
│   └── network-spec.schema.json      # 根元Schema（引用三平面）
├── examples/
│   └── ndn-cdn/                      # NDN边缘视频缓存完整示例
│       ├── topology.yaml
│       ├── control-plane.yaml
│       └── data-plane.yaml
├── converters/
│   ├── yaml_to_topology_json.py      # topology.yaml → ParaNet topology JSON
│   ├── yaml_to_pne.py                # control+data.yaml → PNE text
│   └── validate.py                   # 跨面约束校验
└── docs/
    └── schema-reference.md
```

## 实施步骤

### Step 1: 创建 schema/topology.schema.json

核心结构：
- `node_types`: 按类型定义（device_class, capabilities, resources），实例引用类型
- `nodes`: 实例列表（id, node_type, 可选 override）
- `links`: 链路列表（source, target, properties）
- `layers`: 可选分层（access/edge/core）

关键字段映射到 ParaNet topology JSON：
- `capabilities.parser_roots` → `parserRoots`
- `capabilities.profiles` → `profiles`（ipv4/ipv6/ndn/geo 等）
- `capabilities.data_plane_target` → `dataPlaneTarget`（bmv2/tofino）

### Step 2: 创建 schema/control-plane.schema.json

核心结构：
- `controller`: 框架（onos）、部署位置、冗余策略
- `addressing`: 编址方案（ip_based/name_based/geo_based/hybrid），含 NDN 配置
- `forwarding_tables`: 表定义（name, kind, match_fields, actions, size, target_node_types）
- `routes`: 路由定义（from/to/via/protocol），映射到 PNE intent route 块
- `policies`: 匹配-动作策略，映射到 PNE intent policy 块
- `strategies`: 缓存/转发/调度策略
- `reachability` / `determinism`: 约束定义

### Step 3: 创建 schema/data-plane.schema.json

核心结构：
- `headers`: 全局头部定义（name, fields[{name, bit_width}]）
- `metadata_types`: 元数据定义
- `profiles`: 按 node_type 的数据面 profile
  - `parser`: 状态机（states → extract → transitions）
  - `tables`: P4 表（name, match_type, key_fields, actions, size）
  - `registers`: 有状态寄存器
  - `pipeline`: ingress/egress 步骤序列
  - `service_chain`: 模块组合顺序

Profile 映射到 PNE：
- 每个 profile → `module NAME { parser {...} control {...} }`
- tables → `map<K,V>[N]` 声明
- pipeline → `apply()` 调用序列
- service_chain → `service [name] { A -> B -> C }`

### Step 4: 创建 NDN CDN 完整示例

参照 ParaNet 中已有的 NDN 例子：
- `D:\code\ParaNet\dsl\examples\ndn_content.pn` — DSL 意图定义
- `D:\code\ParaNet\demo\example1\lynette-dev\input\NDN_example\ndn_headers.pne` — 头部定义
- `D:\code\ParaNet\demo\example1\lynette-dev\input\NDN_example\ndn_forwarding.pne` — CS/PIT/FIB 转发模块

将上述 PNE 定义翻译为三个 YAML 文件，作为 Schema 的验证用例。

### Step 5: 创建转换器

**yaml_to_topology_json.py**: topology.yaml → ParaNet `mvp_topology.json` 格式
**yaml_to_pne.py**: control-plane.yaml + data-plane.yaml → PNE module + intent 文本
**validate.py**: 跨面约束校验

校验规则：
1. 控制面表引用的 node_type 必须在拓扑中存在且 capabilities 匹配
2. 数据面 match_fields 必须在 headers 中有对应字段
3. 数据面表名与控制面 forwarding_tables 名一一对应
4. pipeline 步骤引用的表必须在 profile.tables 中定义
5. 头部字段总位数字节对齐

### Step 6: 创建文档

schema-reference.md: 字段说明、枚举值、跨面引用关系、示例

## 关键 ParaNet 文件（转换器必须兼容）

- `D:\code\ParaNet\compiler\pipeline.py` — `compile_pipeline(pne_text, topology_snapshot=...)` 接口
- `D:\code\ParaNet\compiler\semantic\collector_pne_intent.py` — PNE intent 语义收集
- `D:\code\ParaNet\examples\pne\mvp_topology.json` — topology JSON 格式参考
- `D:\code\ParaNet\compiler\frontend\grammar_pne_intent.lark` — PNE intent 语法
- `D:\code\ParaNet\compiler\frontend\grammar_pne.lark` — PNE 基础语法
- `D:\code\ParaNet\paranet\models\protocol\ndn.py` — NDN Pydantic 模型

## 验证方式

1. JSON Schema 校验：`jsonschema -i examples/ndn-cdn/topology.yaml schema/topology.schema.json`
2. 跨面约束校验：`python converters/validate.py examples/ndn-cdn/`
3. 端到端验证：转换器输出 → ParaNet `compile_pipeline()` → 检查 P4 产物是否生成
4. LLM 生成测试：用 Schema + prompt 让 LLM 生成 YAML，校验通过率
