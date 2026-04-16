# 专利技术交底书

## 发明名称

一种基于多态领域特定语言的可编程网络协议设计、编译与自动生成方法及系统

---

## 1.1 技术领域

本发明属于软件定义网络（SDN）和可编程数据平面技术领域，具体涉及一种基于多态领域特定语言（Polymorphic DSL）的网络协议三面（拓扑面、控制面、数据面）统一描述、跨平面协同编译及多目标后端自动代码生成的方法与系统。

---

## 1.2 与本发明相关的已有技术以及已有技术的缺点

### 已有技术一：P4语言

P4（Programming Protocol-Independent Packet Processors）是一种用于描述可编程数据平面设备数据包处理逻辑的领域特定语言。P4允许网络工程师定义数据包的解析流程、匹配-动作表及动作处理逻辑，是当前学术界和工业界在可编程网络数据面方面的事实标准。

**缺点**：

1. **仅覆盖数据面**：P4仅能描述数据平面的转发行为，无法描述网络拓扑部署、设备管理通道配置或控制面逻辑，工程师需要分别使用其他工具管理拓扑和控制面；
2. **缺乏协议级抽象**：P4以单设备视角编写程序，无法从"协议"层面统一定义多个设备的协同行为，缺乏协议继承、组合和复用机制；
3. **手动管理设备差异**：不同P4后端（BMv2/v1model、Tofino/TNA）需要手动编写不同的P4程序，缺乏自动适配机制。

### 已有技术二：ONOS/ODL SDN控制器应用开发

ONOS（Open Network Operating System）等SDN控制器允许通过Java应用扩展网络控制逻辑，提供分布式状态存储、设备发现、事件监听、流规则下发等能力。

**缺点**：

1. **开发门槛高**：需要熟悉OSGi组件模型、ONOS API、Maven构建体系等，开发周期长；
2. **与数据面割裂**：控制面应用与数据面P4程序之间缺乏统一的语义关联，需要人工保证二者的一致性；
3. **无拓扑感知**：控制面应用的开发与网络拓扑部署分离，无法根据拓扑自动生成设备发现、流规则推送等逻辑。

### 已有技术三：传统网络配置语言（NETCONF/YANG、Ansible等）

这些工具通过声明式或命令式方式配置已有网络设备的参数，适用于基于传统协议（OSPF、BGP、VXLAN等）的网络管理。

**缺点**：

1. **只能配置，不能创造**：这些工具基于已有的网络协议构建服务功能链或网络功能虚拟化（NFV），无法设计全新的网络协议；
2. **缺乏三面统一**：拓扑描述、控制逻辑、数据面处理分散在不同工具中，缺乏统一的语义描述框架；
3. **表达力有限**：不支持确定性网络（DetNet）、零信任安全、内容分发等新型网络范式的完整描述。

### 已有技术四：ParaNet系统中的PNE DSL

ParaNet系统中的PNE（Protocol Network Engineering）DSL是一种意图驱动的网络描述语言，支持IP、NDN、GEO等协议的意图覆盖层（Intent Overlay），可编译生成网络配置。

**缺点**：

1. **面向已有协议**：PNE基于已有的传统网络协议进行配置和服务编排，不能设计全新的网络协议栈；
2. **单面描述**：PNE主要描述意图层的路由策略，不包含拓扑部署、设备管理和控制面逻辑的完整描述；
3. **不支持协议继承**：缺乏协议的继承（extends）和混入（mixin）组合机制，无法实现协议族的层次化设计。

---

## 2.1 本发明所要解决的技术问题（发明目的）

本发明所要解决的技术问题是：如何提供一种统一的、声明式的领域特定语言及配套编译系统，使网络工程师能够在一个协议定义文件中完整描述网络协议的拓扑部署、控制面逻辑和数据面处理行为，并通过自动化的编译流水线，生成可直接部署的拓扑配置、SDN控制器应用（ONOS App）和可编程数据面程序（P4代码）。

具体包括以下子问题：

1. **三面统一描述问题**：如何设计一种语言结构，使网络协议的拓扑面、控制面和数据面在同一文件中以块（block）方式组织，同时支持跨面引用（如控制面引用拓扑面的设备信息，数据面引用控制面的运行时状态）；
2. **协议继承与组合问题**：如何支持协议之间的继承（extends）和混入（with）组合，实现协议族的层次化设计与代码复用；
3. **拓扑面到部署的自动展开问题**：如何将抽象的拓扑模式（如spine-leaf参数化模板）自动展开为具体的设备节点和链路，并生成可视化拓扑图；
4. **控制面到ONOS应用的自动生成问题**：如何将声明式的控制逻辑描述自动编译为完整的ONOS应用源代码（包括应用描述符、Maven构建文件、OSGi组件类、事件监听器等）；
5. **数据面到多目标P4代码的自动生成与设备分区问题**：如何根据拓扑面的设备信息，将数据面的处理模块自动分配到各个可编程设备上，并为不同P4后端（BMv2/v1model、Tofino/TNA）生成对应的目标代码。

---

## 2.2 本发明提供的完整技术方案

### 2.2.1 总体架构

本发明提出一种基于多态领域特定语言（Polymorphic DSL）的网络协议三面统一编译系统，整体架构如下：

```
                    ┌─────────────────────────────┐
                    │   Polymorphic DSL 源文件      │
                    │  (polymorphic XXX { ... })    │
                    └──────────┬──────────────────┘
                               │
                    ┌──────────▼──────────────────┐
                    │  Phase 1: 前端编译            │
                    │  Lark文法 → AST (32种节点)    │
                    └──────────┬──────────────────┘
                               │
               ┌───────────────┼───────────────┐
               │               │               │
    ┌──────────▼──────┐ ┌─────▼──────┐ ┌──────▼──────┐
    │ Phase 2: 拓扑面  │ │Phase 3:    │ │Phase 4:     │
    │ 拓扑收集器       │ │控制面      │ │数据面       │
    │ AST → TopologyIR│ │AST→ControlIR│ │AST+TopoIR  │
    │ 模式展开         │ │事件/状态   │ │→ DataIR     │
    │ → 可视化渲染     │ │→ ONOS Java │ │设备分区     │
    └─────────────────┘ └────────────┘ │→ P4代码     │
                                       └─────────────┘
```

### 2.2.2 语言设计

**协议定义结构**：使用`polymorphic`关键字定义协议，支持`extends`单继承和`with`多混入组合：

```
polymorphic <协议名> extends <父协议> with <混入1>, <混入2> {
    topology { ... }    // 拓扑面
    control { ... }     // 控制面
    data { ... }        // 数据面
}
```

**三面块结构**：

- **拓扑面（topology）**：定义设备Profile（P4目标架构、编译器后端、管理通道）、拓扑模式（参数化的spine-leaf等模板）、具体节点、链路和约束条件；
- **控制面（control）**：定义ONOS应用元数据、能力声明、分布式状态、设备发现、事件处理、周期任务和流规则推送；
- **数据面（data）**：定义数据包格式、解析器、可复用处理模块（module）、服务放置规则（service）和文件包含（include）。

**跨面引用机制**：三个面通过标识符相互引用——控制面引用拓扑面的设备Profile和管理通道，数据面引用控制面的运行时状态和拓扑面的设备角色信息。

### 2.2.3 编译流水线

本发明的编译流水线包含五个阶段：

**Phase 1——前端编译（语法分析 + AST构建）**：

- 基于Lark LALR解析器，使用上下文相关词法分析器（contextual lexer）实现42个保留关键字与用户标识符的正确区分；
- 通过Transformer模式将解析树转换为包含32种节点类型的类型化抽象语法树（AST），涵盖值节点、拓扑节点、控制节点和数据节点；
- 所有AST节点基于dataclass实现，通过`__dataclass_fields__` + `getattr`序列化机制避免嵌套对象递归问题。

**Phase 2——拓扑面编译**：

- 从AST收集Profile信息，构建Profile映射表；
- 对抽象拓扑模式（pattern）进行参数化展开，生成具体设备节点和全互连（mesh）/一对一链路；
- 支持混合使用抽象模式和具体节点定义；
- 输出TopologyIR，包含展开后的设备节点（含位置坐标、设备类型、Profile信息、管理通道配置）、链路和约束条件；
- 提供to_render_json()方法输出前端D3.js拓扑渲染引擎所需的JSON格式。

**Phase 3——控制面编译**：

- 将控制面AST转换为ControlIR，包含ONOS应用元数据、Java类型映射的状态声明、事件处理映射、周期任务和流规则推送指令；
- 事件映射机制：将DSL事件名（link_down、device_connected等）映射到ONOS事件类（LinkEvent、DeviceEvent等）；
- Java类型推导：支持DSL类型到Java类型的嵌套泛型解析（如`map<string, map<string, string>>` → `Map<String, Map<String, String>>`）；
- ONOS代码生成器根据ControlIR生成完整的应用源代码包，包含app.xml描述符、pom.xml构建文件、OSGi组件类（含@Activate/@Deactivate生命周期、@Reference服务注入、ScheduledExecutorService定时任务）、事件监听器类。

**Phase 4——数据面编译**：

- DSL类型到P4类型映射（mac_addr→bit48、ipv4_addr→bit32、bitN→bitN、port_t→bit9或PortId_t）；
- When子句解析：通过正则表达式从声明式匹配条件中提取P4表匹配键（支持精确匹配、三元匹配、最长前缀匹配）；
- **设备分区算法**：根据服务放置规则（service.applies）与拓扑设备角色的匹配关系，将处理模块自动分配到对应的P4可编程设备上，同时过滤非P4目标设备（如Linux主机）；
- 根据设备Profile的pipeline字段自动选择P4架构（v1model或TNA），并收集每个设备所需的数据包定义和解析器；
- P4代码生成器为每个设备生成完整的P416程序，包含头声明、解析器（select分支）、匹配-动作表、ingress/egress控制块、反解析器和顶层Switch实例化。

**Phase 5——全流程集成**：

- 通过FastAPI REST API暴露解析、ONOS代码生成、P4代码生成三个端点；
- 前端React界面集成Monaco代码编辑器、D3.js拓扑可视化、生成代码多标签查看器。

### 2.2.4 关键数据结构

**AST节点体系**（32种节点类型）：以PolyAstNode为基类，分为值节点（PolyValueNode、PolyListValueNode、PolyObjectValueNode等）、拓扑节点（ProfileNode、PatternNode、TopoNodeDefNode、LinkDefNode等）、控制节点（AppMetaNode、StateDeclNode、OnEventNode、PeriodicNode等）和数据节点（PacketDefNode、ParseDefNode、ModuleDefNode、ServiceDefNode等）四个层次。

**中间表示（IR）**：三面各有独立的IR数据结构——TopologyIR（含DeployedNode/DeployedLink）、ControlIR（含OnosAppMeta/OnosEventHandler/OnosPeriodicTask等）、DataIR（含PacketIR/ModuleIR/DeviceP4Program等）。IR之间通过设备ID和角色名称建立关联。

---

## 2.3 本发明技术方案带来的有益效果

1. **三面统一，消除割裂**：网络工程师在一个文件中完整描述协议的拓扑部署、控制逻辑和数据面处理，消除了传统方法中三个平面使用不同工具、手动保持一致性的问题；
2. **声明式编程，降低门槛**：工程师以声明式方式描述"网络应该做什么"而非"如何做"，由编译器自动生成ONOS Java应用和P4代码，将控制面开发从Java/OSGi专业编程降级为DSL描述；
3. **协议复用，加速创新**：通过extends/with继承组合机制，已验证的协议可作为基础协议被继承和扩展，新协议只需描述差异部分，避免重复开发；
4. **多目标自动适配**：同一份数据面描述可自动编译为BMv2（v1model）和Tofino（TNA）两种P4后端代码，无需手动适配不同硬件平台；
5. **智能设备分区**：编译器根据服务放置规则和拓扑设备角色自动将处理模块分配到对应设备，保证每个设备只包含其所需的处理逻辑；
6. **端到端可视化**：从DSL描述到拓扑可视化、控制面代码生成、数据面代码生成，全流程在Web界面中完成，支持即时预览和迭代；
7. **覆盖新型网络范式**：支持确定性网络（DetNet）、计算感知网络、零信任安全、组播/内容分发等传统方案难以覆盖的新型网络场景。

---

## 2.4 具体实施方式

### 实施例一：确定性网络（DetNet）协议的完整设计与编译

#### 1. 协议定义

网络工程师在ParaNet系统的协议设计页面中，使用Polymorphic DSL编写确定性Fabric协议定义文件`poly_deterministic.poly`，内容如下：

```
polymorphic DeterministicFabric extends BaseFabric with MonitoringMixin, SecurityMixin {
    topology {
        profile spine-profile {
            target: "p4"
            pipeline: "ingress"
            compiler: "p4c"
            mgmt { protocol: "grpc" port: 50051 auth: "tls" }
        }
        profile leaf-profile {
            target: "p4"
            pipeline: "ingress"
            compiler: "p4c"
            mgmt { protocol: "grpc" port: 50052 auth: "tls" }
        }
        pattern spine_leaf(redundancy: "dual") {
            layer spine(2) { profile: "spine-profile" }
            layer leaf(4) { profile: "leaf-profile" }
            mesh(spine, leaf)
        }
        node spine1 { role: "spine" profile: "spine-profile"
            mgmt { address: "10.0.0.1" protocol: "grpc" port: 50051 } }
        node leaf1 { role: "leaf" profile: "leaf-profile"
            mgmt { address: "10.0.1.1" protocol: "grpc" port: 50052 } }
        link spine1 -> leaf1 { bandwidth: "100G" latency: "0.1ms" }
        constrain links: "latency < 5ms"
    }

    control {
        app { name: "deterministic-controller" version: "1.0.0"
              description: "Deterministic fabric controller with TSN guarantees"
              onos_version: "2.7"
              features: ["topology_discovery", "path_computation"] }
        capabilities: ["forwarding", "monitoring", "deterministic_scheduling"]
        state device_count: int;
        state flow_count: int;
        state is_converged: bool;
        periodic health_check { every: "60s"
            check_all_devices(); report_status(); }
        on link_down(src, dst) {
            detect_failure(src, dst); trigger_reroute(src, dst); }
        on device_connected(device_id) {
            authenticate_device(device_id); install_base_rules(device_id); }
        flow_push { target: "spine1"
            rules: from acl.deterministic_rules via netconf.default }
    }

    data {
        packet ethernet_packet {
            header { dst_mac: mac_addr; src_mac: mac_addr;
                     eth_type: bit16; vlan_id: bit12; }
            metadata { ingress_port: port_t; timestamp: uint64; flow_id: uint32; }
        }
        parse eth_parser {
            extract ethernet_packet
            match eth_type {
                "0x0800" => extract ipv4_parser,
                _ => drop, } }
        module forward(ethernet_packet) {
            when: eth_type == 0x0800 && dst_mac != 0xFFFFFFFFFFFF;
            action: l2_forward(pkt);
            constraints { priority: "high"; max_latency: "1ms"; } }
        module deterministic_schedule(ethernet_packet) {
            when: flow_id != 0;
            action: apply_schedule(flow_id);
            constraints { priority: "critical"; guarantee: "deterministic"; } }
        service l2_forwarding {
            applies: ["leaf", "spine"]
            target_role: "switch" pipeline: "ingress" }
        service tsn_scheduler {
            applies: ["spine"]
            target_role: "switch" pipeline: "egress"
            constraints: ["must_have_timing_support", "requires_ptp"] }
    }
}
```

#### 2. 前端编译（Phase 1）

系统使用Lark LALR解析器对上述DSL文本进行语法分析。解析器采用上下文相关词法分析器，在42个保留关键字（如polymorphic、topology、control、data、profile、pattern、node、link、module、service等）与用户自定义标识符之间正确消歧。解析结果通过Transformer模式转换为包含32种节点类型的类型化AST。

AST节点采用dataclass实现，例如PacketDefNode包含name（数据包名称）、headerfields（头字段列表）、metadatafields（元数据字段列表）三个属性；ModuleDefNode包含name（模块名）、packetref（引用的数据包）、whenclause（匹配条件）、actionclause（动作描述）、constraints（约束字典）五个属性。

#### 3. 拓扑面编译（Phase 2）

拓扑收集器从AST中提取所有Profile定义，构建Profile映射表：{"spine-profile": {target: "p4", pipeline: "ingress", compiler: "p4c", mgmt: {protocol: "grpc", port: 50051}}, ...}。

对于pattern定义，收集器执行参数化展开：spineleaf模式中的layer spine(2)生成spine-1、spine-2两个节点，layer leaf(4)生成leaf-1至leaf-4四个节点，mesh(spine, leaf)生成2×4=8条全互连链路。展开后的节点继承对应Profile的P4目标信息和管理通道配置。

展开结果与具体节点（spine1、leaf1等）和具体链路合并，生成TopologyIR。TopologyIR提供torenderjson()方法，输出包含节点（id、name、type、position、properties、config）和链路（id、source、target、bandwidth、delay）的JSON结构，供前端D3.js力导向图引擎进行可视化渲染。

#### 4. 控制面编译（Phase 3）

控制收集器将AST中的控制面定义转换为ControlIR：

- AppMetaNode转换为OnosAppMeta，包含name、version、description、onosversion、features、packagename（从应用名称自动派生Java包名）；
- StateDeclNode通过typeexprtojava()函数映射为Java类型：int→Integer、bool→Boolean、mapK,V→MapK,V（支持嵌套泛型解析）；
- OnEventNode通过eventnametoclass()函数映射到ONOS事件类：linkdown→LinkEvent、deviceconnected→DeviceEvent；
- PeriodicNode通过parseintervaltoms()函数将时间间隔字符串转换为毫秒：60s→60000ms。

ONOS代码生成器根据ControlIR生成以下文件：

- **app.xml**：ONOS应用描述符，包含应用名称、版本、特性列表；
- **pom.xml**：Maven构建文件，包含ONOS API依赖和Bundle打包配置；
- **主组件类**（如DeterministicControllerAppComponent.java）：包含@Activate/@Deactivate生命周期方法、@Reference服务注入（CoreService、DeviceService、FlowRuleService等）、ScheduledExecutorService定时任务注册、事件监听器注册和流规则推送方法；
- **事件监听器类**（如LinkDownListener.java）：实现DeviceListener、LinkListener、TopologyListener接口，将事件分发到主组件的对应处理方法。

#### 5. 数据面编译（Phase 4）

数据收集器执行以下步骤：

**类型解析**：resolvep4type()函数将DSL类型映射到P416类型——macaddr→bit48、bit16→bit16、portt→bit9（v1model架构）或PortIdt（TNA架构）。

**When子句解析**：parsewhenclause()函数通过正则表达式从模块的when子句中提取匹配键。例如"ethtype == 0x0800 && dstmac != 0xFFFFFFFFFFFF"被解析为两个MatchKeyIR：{fieldname: "ethtype", matchkind: "exact"}和{fieldname: "dstmac", matchkind: "ternary"}。

**设备分区**：遍历TopologyIR中的所有设备节点，过滤出P4可编程设备（profile.target为"p4"或"bmv2"或"tofino"），排除Linux主机等非P4目标。对于每个P4设备，检查其角色（spine/leaf）是否在service.applies列表中。spine1和spine2匹配l2forwarding（applies: ["leaf", "spine"]）和tsnscheduler（applies: ["spine"]），因此获得forward和deterministicschedule两个模块；leaf1和leaf2只匹配l2forwarding，因此只获得forward模块。

**P4代码生成**：为每个设备生成独立的P416程序。由于设备Profile的pipeline为"ingress"（非tna），选择v1model架构生成。每个P4程序包含：

- include core.p4和include v1model.p4头文件引用；
- 数据包头类型声明（header ethernetpackett { bit48 dstmac; ... }）；
- 元数据和头结构体声明；
- Parser块，使用select语句实现匹配-分支逻辑；
- Ingress控制块，每个模块生成一个匹配-动作表（table tblforward { key = { hdr.ethernetpacket.ethtype: exact; } actions = { actforward; drop; } }）；
- Egress控制块、校验和控制块（空实现）、反解析块；
- V1Switch(Parser(), VerifyChecksum(), Ingress(), Egress(), ComputeChecksum(), Deparser()) main;顶层实例化。

#### 6. 前端展示

用户在Web界面中点击"编译 ONOS App"按钮，系统调用后端API，在"生成代码"标签页中以多级Tabs展示生成的app.xml、pom.xml、主组件类和事件监听器类，每个文件使用Monaco编辑器以只读模式展示，并根据文件扩展名自动切换语法高亮（Java或XML）。

用户点击"编译 P4"按钮，系统调用后端API，在"P4 代码"标签页中展示每个设备的P4程序文件，文件路径按devices/{deviceid}/{deviceid}.p4组织。

### 实施例二：不同P4后端目标的自动适配

当设备Profile指定不同的P4目标时，系统自动选择对应的P4架构和代码模板：

```
profile tofino-switch {
    target: "tofino"
    pipeline: "tna"
    compiler: "bf-p4c"
}
```

数据收集器检测到pipeline为"tna"，将该设备的p4arch设置为"tna"。P4代码生成器使用TNA模板生成代码，差异包括：引用include tna.p4而非v1model.p4、使用tnametadatat替代standardmetadatat、Parser签名不同、顶层使用TNA()而非V1Switch()实例化。同时，portt类型映射为PortIdt而非bit9。

---

## 2.5 本发明的技术关键点和欲保护点

### 技术关键点

1. **三面统一的协议描述语言设计**：通过polymorphic关键字、topology/control/data三个块结构、extends/with继承组合机制，实现网络协议拓扑面、控制面、数据面的统一声明式描述；
2. **跨面引用的编译依赖管理**：拓扑面提供设备Profile和角色信息，控制面引用拓扑面的管理通道和设备信息，数据面依赖拓扑面的设备分区和控制面的运行时状态，编译流水线按topology→control→data的依赖顺序执行；
3. **参数化拓扑模式的自动展开算法**：将抽象的pattern定义（包含参数化层数和互连关系）展开为具体的设备节点集合和链路集合，支持mesh和one-to-one连接类型；
4. **声明式控制逻辑到ONOS应用的自动映射机制**：将DSL中的状态声明、事件处理、周期任务、流规则推送等声明式描述自动映射到ONOS框架的分布式存储、事件监听器、定时执行器和流规则服务等组件；
5. **基于服务放置规则的数据面设备分区算法**：根据service.applies中的设备角色列表与拓扑面中设备节点的角色匹配关系，自动将处理模块分配到对应设备，并根据设备Profile的pipeline字段选择P4目标架构；
6. **When子句到P4匹配键的自动提取方法**：通过正则表达式从声明式when子句中提取字段名和匹配类型（精确/三元/最长前缀），自动生成P4表的key声明；
7. **多目标P4代码生成器**：根据设备架构（v1model/TNA）选择不同的代码模板，生成包含头声明、解析器、匹配-动作表、控制块和顶层实例化的完整P416程序。

### 欲保护点

1. 一种基于多态领域特定语言的网络协议三面统一描述方法，其特征在于：使用polymorphic关键字定义协议，通过topology、control、data三个块分别描述网络拓扑部署、SDN控制面逻辑和可编程数据面处理，支持extends继承和with混入组合；
2. 一种网络协议拓扑面的参数化模式展开方法，其特征在于：将包含层数定义和互连关系的抽象拓扑模式自动展开为具体的设备节点和链路，并与手动定义的节点合并生成完整的部署拓扑；
3. 一种声明式控制逻辑到SDN控制器应用的自动编译方法，其特征在于：将DSL中的状态声明映射为控制器分布式存储、事件处理映射为事件监听器、周期任务映射为定时执行器、流规则推送映射为流规则服务调用，自动生成包含应用描述符、构建文件和OSGi组件类的完整控制器应用源代码；
4. 一种基于服务放置规则的可编程数据面设备分区与多目标代码生成方法，其特征在于：根据服务定义中的设备角色列表与拓扑中设备节点的角色匹配关系，将数据面处理模块自动分配到对应设备，根据设备Profile自动选择P4目标架构，并为每个设备生成独立的P416程序；
5. 一种从声明式匹配条件到P4表匹配键的自动提取方法，其特征在于：通过正则表达式解析模块定义中的when子句，提取字段名和匹配类型（精确匹配、三元匹配、最长前缀匹配），自动生成P4表的key声明和匹配-动作表；
6. 一种网络协议三面协同编译流水线，其特征在于：按照拓扑面→控制面→数据面的依赖顺序执行编译，拓扑面为控制面提供设备信息和管理通道，为数据面提供设备Profile和P4目标架构信息，控制面为数据面提供运行时状态引用，实现三面之间的语义一致性。

