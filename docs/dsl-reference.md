# ParaNet DSL 参考

ParaNet DSL 是一种声明式语言，用于描述网络拓扑和意图。

## 语法概述

### 网络定义

```paranet
network mynetwork {
    name: "My Network"
    description: "A sample network"
    
    // 节点和链路定义
}
```

### 节点定义

```paranet
node router1 :router {
    address: "192.168.1.1"
    location: "datacenter-a"
}

node ndn_node :ndn_cache {
    prefix: "/ndn/video"
    cache_size: "10GB"
}
```

### 链路定义

```paranet
link {
    endpoints: [router1, router2]
    bandwidth: "1Gbps"
    latency: "5ms"
}
```

### 路由定义

```paranet
route my_route {
    from: node1
    to: prefix("192.168.2.0/24")
    via: router1, router2
    protocol: ip
}
```

`reachability { ... }` 与 `route { ... }` **语义等价**（统一 AST）。可选 `constraints { key: value ... }` 块，由对应剖面适配器解释。

### 剖面（profile）与协议别名

- `protocol:` 与 `profile:` 均可指定剖面；**同时存在时 `profile` 优先**。
- 兼容别名：`ip` 规范化为 **`ipv4`**（路由表名仍为 `ip_route_table`）。

### 确定性调度（工业实时等）

```paranet
determinism D1 {
  cycle_us: 1000
  master: "plc-1"
}
schedule S1 {
  node: "drive-3"
  slot: 7
}
```

### 策略定义

```paranet
policy cache_policy {
    match: {
        prefix: "/ndn/video"
    }
    action: {
        cache: true
        ttl: "3600"
    }
}
```

可选 `protocol:` / `profile:` 与路由一致，用于标注策略所属剖面。

## 协议支持

完整设计见 **[Intent 统一模型与剖面](./intent-unified-model.md)**。

### IP 协议

- 路由表配置
- ACL 规则
- QoS 策略
- 注册剖面：`ipv4`（别名 `ip`）、`ipv6`、`srv6`（可选 `path:` SID 列表）

### NDN 协议

- Name 前缀路由
- FIB 配置
- 缓存策略
- 转发策略
- 注册剖面：`ndn`（`prefix({ kind: "name", value: "..." })`）

### GEO 协议

- 位置分配
- 区域定义
- 地理路由规则
- 注册剖面：`geo`

### Powerlink

- 不在 `route` 中描述 L3 可达性；请使用 `determinism` / `schedule` 句型（见上文）。

## 编译管线（MVP）

自 `ProgramIR` 起可调用 `compile_pipeline`（见 [`compiler/README.md`](../compiler/README.md)）：分片（Fragment）、放置（NodePlan）、占位后端产物（`program.p4` / `entries.json` / `manifest.json`）。拓扑 JSON 形状见 [拓扑快照契约](./topology-snapshot-schema.md)。

## 示例

详见 `dsl/examples/` 目录；MVP 示例：`examples/pne/mvp_demo.pne` 与 `examples/pne/mvp_topology.json`。
