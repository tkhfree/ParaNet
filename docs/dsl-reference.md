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

## 协议支持

### IP 协议

- 路由表配置
- ACL 规则
- QoS 策略

### NDN 协议

- Name 前缀路由
- FIB 配置
- 缓存策略
- 转发策略

### GEO 协议

- 位置分配
- 区域定义
- 地理路由规则

## 示例

详见 `dsl/examples/` 目录。
