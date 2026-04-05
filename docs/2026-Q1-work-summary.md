# 2026年Q1工作总结 — 基于LLM的自定义网络协议设计系统

## 一、工作背景与目标

### 1.1 研究动机

传统网络协议设计依赖领域专家手工完成，周期长、成本高。随着大语言模型（LLM）能力的提升，探索利用LLM根据用网场景自动生成自定义网络协议成为可能。本项目旨在研究并实现一套从"场景需求自然语言描述"到"可执行网络协议代码"的自动化管线。

### 1.2 核心约束

- 生成协议遵循IEEE 802.3标准，从网络层开始自定义（非传统TCP/IP协议栈）
- 目标场景：NDN（Named Data Networking）边缘计算与边缘视频缓存
- 数据面基于P4语言，控制面复用ONOS框架，拓扑用JSON表达
- 与现有ParaNet编译器管线集成

---

## 二、关键技术问题讨论与决策

### 2.1 网络协议设计的三面抽象

**问题**：网络协议设计应分解为哪些正交维度？

**研究结论**：三面抽象模型，且存在严格的依赖链。

```
拓扑定义（Infrastructure）
    ↓  定义"有什么"：节点类型、能力、链路、分层结构
控制平面（Control Plane）
    ↓  定义"怎么管"：路由计算、策略决策、表项下发
数据平面（Data Plane）
    ↓  定义"怎么转"：报文解析、字段匹配、动作执行
```

**关键纠偏**：初期曾将报文头解析错误归类为控制平面。经专业审视后明确——**报文头解析是数据平面的核心职责**。判定标准：逐包执行的归数据面，策略计算的归控制面。

| 平面 | 职责 | 典型内容 |
|------|------|----------|
| 拓扑 | 网络基础设施定义 | 节点类型、实例、链路属性、分层 |
| 控制面 | 转发决策 | 路由算法、FIB/PIT/CS表管理、缓存策略 |
| 数据面 | 报文处理执行 | Parser状态机、表匹配、动作执行、寄存器 |

### 2.2 协议表示方式对比：YAML vs PNE DSL

**问题**：LLM输出的协议规范应采用什么格式？

**对比实验**（同一NDN Interest转发策略，10次生成）：

| 维度 | YAML | PNE DSL（自定义语法） |
|------|------|----------------------|
| 信息完整度 | 完整 | 完整（等价） |
| LLM语法正确率 | **10/10** | 7/10 |
| LLM结构正确率 | **9/10** | 8/10 |
| 字段完整率 | **10/10** | 9/10 |
| 校验工具链 | JSON Schema（成熟） | Lark Parser（需自建） |
| 可读性 | 高 | 中 |

**决策**：LLM输出YAML格式，程序内部转换为PNE DSL后接入ParaNet编译器。

**理由**：
1. LLM对YAML的训练语料覆盖远超自定义DSL
2. JSON Schema校验生态成熟，一行命令即可验证
3. YAML和PNE DSL信息等价，转换无损
4. 转换为PNE DSL后可直接复用ParaNet现有编译管线

### 2.3 数据面多节点表达方式

**问题**：拓扑中包含多种节点类型，数据面应如何表达？

**研究结论**：按**node_type**定义profile，而非按节点实例逐一列举。

- 同类型节点共享同一个P4程序（profile）
- 不同类型节点通过capabilities差异区分profile
- Profile支持继承（extends）复用公共定义
- 拓扑实例通过`node_type`字段映射到对应profile

以NDN边缘视频缓存为例，定义了三种profile：
1. `edge_cache_forwarder` — 完整CS/PIT/FIB，小表
2. `core_router_forwarder` — 完整CS/PIT/FIB，大表
3. `compute_dispatch` — 仅有compute_dispatch_table

### 2.4 Tofino ASIC上的TLV解析

**问题**：NDN的变长TLV名称编码如何在Tofino硬件上实现？

**研究结论**：Tofino限制（parser最多64次循环、不支持无限varbit），采用混合方案：

1. **分段解析**：固定最大名称深度（如8级），每次循环提取一个NameComponent
2. **Metadata传递状态**：用metadata记录已解析组件数和剩余长度
3. **名称哈希匹配**：解析时计算名称哈希，表查找用固定宽度哈希而非变长名称
4. **分级匹配**：前几级组件做精确匹配，末级做ternary通配

---

## 三、系统架构设计

### 3.1 整体管线

```
场景描述（自然语言）
       │
       ▼
   LLM 分轮生成
       │
       ├─→ Round 1: 场景理解 → topology.yaml
       ├─→ Round 2: 拓扑 + 场景 → control-plane.yaml
       └─→ Round 3: 控制面 + 约束 → data-plane.yaml
              │
              ▼
       跨面约束校验（validate.py）
              │
              ▼
       拆解转换（converters）
       ├─→ topology.json        ← ParaNet拓扑格式
       ├─→ PNE module + intent   ← ParaNet编译器输入
       └─→ ONOS app config       ← 控制器配置
              │
              ▼
       ParaNet编译管线
       compile_pipeline(pne_text, topology_snapshot=...)
              │
              ├─→ ProgramIR → FragmentIR → NodePlanIR
              └─→ P4 artifacts per node
```

### 3.2 分轮生成策略

**为什么分三轮而不是一次性生成？**

三面之间存在严格依赖链，一次性生成容易产生不一致：

| 轮次 | 输入 | 输出 | 校验重点 |
|------|------|------|----------|
| 1 | 场景描述 | topology.yaml | 节点类型完整、链路连通、分层合理 |
| 2 | 拓扑 + 场景 | control-plane.yaml | 表引用的节点类型存在、路由路径连通 |
| 3 | 拓扑 + 控制面 | data-plane.yaml | 字段对应、表名一致、字节对齐 |

每轮校验失败时，将错误信息反馈给LLM修正，保证跨面一致性。

### 3.3 跨面约束规则

设计了5条核心约束，由validate.py统一执行：

1. **能力-表约束**：控制面表的`target_node_types`必须在拓扑中存在且capabilities匹配
2. **字段存在性**：数据面match_fields必须在headers中有对应字段定义
3. **表名对应**：数据面P4 table名与控制面forwarding_tables名一一对应
4. **Pipeline完整性**：pipeline步骤引用的表必须在profile.tables中定义
5. **字节对齐**：每个header的字段位宽之和必须是8的倍数

---

## 四、已完成交付物

### 4.1 代码仓库结构

```
D:\code\sysdesign\
├── schema/
│   ├── topology.schema.json          # ✅ 拓扑Schema（Plane 1）
│   ├── control-plane.schema.json     # ✅ 控制面Schema（Plane 2）
│   ├── data-plane.schema.json        # ✅ 数据面Schema（Plane 3）
│   └── network-spec.schema.json      # ✅ 根元Schema
├── examples/
│   └── ndn-cdn/                      # ✅ NDN边缘视频缓存完整示例
│       ├── topology.yaml             #    5种节点类型, 10个实例, 9条链路
│       ├── control-plane.yaml        #    4张转发表, 3条路由, 4条策略
│       └── data-plane.yaml           #    4个header, 3个profile, 完整pipeline
├── converters/
│   ├── yaml_to_topology_json.py      # ✅ 拓扑转换器
│   └── validate.py                   # ✅ 跨面校验器
└── docs/
    └── 2026-Q1-work-summary.md       # 本文档
```

### 4.2 Schema设计要点

**topology.schema.json**
- `node_types`：类型级定义，支持复用；实例通过`node_type`引用
- `capabilities`：映射到ParaNet的parserRoots/profiles/dataPlaneTarget
- `override_capabilities`：实例级能力覆盖，与类型级合并
- `layers`：可选分层结构（access/edge/core）

**control-plane.schema.json**
- `forwarding_tables`：统一表定义（FIB/PIT/CS/ACL等），含`control_plane_managed`标记区分ONOS管理vs数据面自维护
- `addressing`：支持ip_based/name_based/geo_based/hybrid四种编址方案
- `strategies`：参数化的策略定义，支持caching/forwarding/scheduling等
- `determinism`：确定性约束，为后续TSN/工业场景预留

**data-plane.schema.json**
- `profiles`：按node_type的数据面定义，支持`extends`继承
- `parser`：状态机模型（states → extract → transitions），表达多态报文解析
- `pipeline`：ingress/egress步骤序列，含condition/on_hit/on_miss分支
- `service_chain`：模块组合顺序，映射到PNE service块

### 4.3 NDN CDN示例概要

| 维度 | 内容 |
|------|------|
| 节点类型 | ndn_producer, ndn_cache, ndn_core_router, ndn_compute, ndn_consumer |
| 节点实例 | 2个源站 + 2个核心路由 + 2个边缘缓存 + 1个边缘计算 + 3个消费者 |
| 转发表 | cs_table(PIT/CS/FIB) + compute_dispatch_table |
| 数据面Profile | edge_cache_forwarder, core_router_forwarder, compute_dispatch |
| 报文类型 | Interest(0x05), Data(0x06), NACK(0x03)，基于NDN TLV编码 |
| EtherType | 0x8624（自定义NDN） |

---

## 五、与ParaNet项目的集成

### 5.1 已有关键发现

通过深入分析ParaNet代码库（D:\code\ParaNet），梳理了编译管线：

```
compile_pipeline(pne_text, topology_snapshot)
    → PneParser.parse_text()           # Lark语法解析
    → PNEIntentCollector.collect()     # 语义收集 + 拓扑校验
    → build_fragments_from_program()   # IR分片
    → greedy_place()                   # 贪心放置
    → BackendEmitter.emit()            # P4代码生成（BMv2/Tofino）
```

### 5.2 转换器对接点

| YAML Schema | ParaNet输入 | 转换逻辑 |
|-------------|------------|----------|
| topology.yaml | topology_snapshot (JSON) | node_type → capabilities合并 → 标准格式 |
| control-plane.yaml | PNE intent块 | routes → route定义, policies → policy定义 |
| data-plane.yaml | PNE module/service | profiles → module, tables → map, pipeline → apply |

### 5.3 PNE语法映射参考

ParaNet已有的PNE语法元素与YAML Schema的对应关系：

```
PNE service_decl    ←→  data-plane.profiles[].service_chain
PNE module_decl     ←→  data-plane.profiles[]
PNE parser_block    ←→  data-plane.profiles[].parser
PNE control_block   ←→  data-plane.profiles[].pipeline + tables
PNE map_decl        ←→  data-plane.profiles[].tables
PNE register_decl   ←→  data-plane.profiles[].registers
PNE intent route    ←→  control-plane.routes[]
PNE intent policy   ←→  control-plane.policies[]
PNE intent network  ←→  topology整体
```

---

## 六、遗留问题与Q2计划

### 6.1 待完成工作

| 项目 | 状态 | 优先级 |
|------|------|--------|
| yaml_to_pne.py 转换器 | 未开始（设计完成） | P0 |
| schema-reference.md 文档 | 未开始 | P1 |
| JSON Schema自动校验集成 | 未开始 | P1 |
| LLM Prompt模板设计 | 未开始 | P0 |
| LLM生成通过率测试 | 未开始 | P2 |
| 端到端验证（YAML → ParaNet → P4） | 未开始 | P1 |

### 6.2 开放问题

1. **ONOS NDN应用开发**：ONOS原生是OpenFlow思维，NDN的FIB/PIT/CS需要自定义应用，南向接口走P4Runtime（gRPC），ONOS端需开发NdnFibManager、NdnStrategyManager等组件
2. **Tofino Target验证**：当前示例基于BMv2软件交换机，Tofino硬件上的TLV解析和名称哈希匹配需要实际验证
3. **LLM生成质量评估**：需要设计评估指标（语法通过率、语义正确率、跨面一致率），并收集足够样本

### 6.3 Q2工作方向

1. **完成转换器**：实现yaml_to_pne.py，打通YAML → PNE → P4的端到端链路
2. **LLM Prompt工程**：设计三轮生成的prompt模板，包含Schema约束和示例
3. **ONOS应用原型**：开发最小化的NDN ONOS应用，验证P4Runtime南向接口
4. **多场景扩展**：除NDN外，验证Schema对IPv4路由、地理路由等场景的适用性
5. **自动化测试**：建立LLM生成→校验→反馈的闭环测试框架
