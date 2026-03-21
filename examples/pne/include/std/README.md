# PNE Standard Library

PNE 标准库提供了一组可复用的网络处理模块，帮助开发者快速构建网络应用。

## 目录结构

```
std/
├── parser.pne      - 解析器模块
├── l2_forward.pne  - 二层转发模块
├── l3_forward.pne  - 三层转发模块
├── acl.pne         - 访问控制模块
├── qos.pne         - 服务质量模块
├── tunnel.pne      - 隧道封装模块
├── monitor.pne     - 监控统计模块
├── nat.pne         - 地址转换模块
└── std.pne         - 标准库入口（导入所有模块）
```

## 使用方法

### 1. 导入整个标准库

```pne
#include <std/std.pne>
```

### 2. 导入特定模块

```pne
#include <std/parser.pne>
#include <std/l3_forward.pne>
```

### 3. 在应用中使用标准模块

```pne
#include <std/std.pne>

application MyRouter using StdCombinedParser {
    bit<32> nexthop = 0;
    bit<16> egress_port = 0;
    bit<1> should_drop = 0;

    control {
        // 使用标准路由查找
        StdLpmLookup.apply(hdr.ipv4.dst, nexthop, egress_port, should_drop);
        if (should_drop == 1) {
            drop();
            return;
        }
    }
}
```

## 标准模块列表

### Parser 模块

| 模块 | 功能 |
|------|------|
| `StdEthernetParser` | 以太网头部解析 |
| `StdVlanParser` | VLAN 标签解析 |
| `StdIpv4Parser` | IPv4 头部解析 |
| `StdIpv6Parser` | IPv6 头部解析 |
| `StdTcpParser` | TCP 头部解析 |
| `StdUdpParser` | UDP 头部解析 |
| `StdMplsParser` | MPLS 标签解析 |
| `StdVxlanParser` | VXLAN 封装解析 |
| `StdGreParser` | GRE 隧道解析 |
| `StdCombinedParser` | 组合解析器 |

### L2 Forwarding 模块

| 模块 | 功能 |
|------|------|
| `StdMacLearning` | MAC 地址学习 |
| `StdMacLookup` | MAC 地址查找 |
| `StdVlanProcessing` | VLAN 处理 |
| `StdL2Flood` | 二层泛洪 |
| `StdStp` | 生成树协议 |
| `StdSimpleSwitch` | 简单二层交换 |

### L3 Forwarding 模块

| 模块 | 功能 |
|------|------|
| `StdIpValidation` | IP 头部校验 |
| `StdLpmLookup` | 最长前缀匹配 |
| `StdArpLookup` | ARP 表查找 |
| `StdEcmp` | 等价多路径 |
| `StdTtlDecrement` | TTL 递减 |
| `StdChecksumUpdate` | 校验和更新 |
| `StdNeighborLookup` | 邻居表查找 |
| `StdIpv6LpmLookup` | IPv6 LPM 查找 |
| `StdSimpleRouter` | 简单三层路由 |

### ACL 模块

| 模块 | 功能 |
|------|------|
| `StdBasicAcl` | 基础 ACL (五元组) |
| `StdExtendedAcl` | 扩展 ACL |
| `StdStatefulAcl` | 有状态 ACL |
| `StdMacAcl` | MAC ACL |
| `StdIpv6Acl` | IPv6 ACL |
| `StdRateLimiter` | 速率限制 |
| `StdAclFirewall` | ACL 防火墙 |

### QoS 模块

| 模块 | 功能 |
|------|------|
| `StdClassifier` | 流量分类器 |
| `StdMeter` | 流量计量 |
| `StdPolicer` | 流量监管 |
| `StdMarker` | DSCP 标记 |
| `StdQueueScheduler` | 队列调度 |
| `StdWfqScheduler` | WFQ 调度器 |
| `StdShaper` | 流量整形 |
| `StdTrafficPolicer` | 流量策略器 |

### Tunnel 模块

| 模块 | 功能 |
|------|------|
| `StdVxlanEncap` | VXLAN 封装 |
| `StdVxlanDecap` | VXLAN 解封装 |
| `StdGreEncap` | GRE 封装 |
| `StdGreDecap` | GRE 解封装 |
| `StdIpInIpEncap` | IP-in-IP 封装 |
| `StdIpInIpDecap` | IP-in-IP 解封装 |
| `StdMplsPush` | MPLS 标签压入 |
| `StdMplsPop` | MPLS 标签弹出 |
| `StdMplsSwap` | MPLS 标签交换 |
| `StdGeneveEncap` | GENEVE 封装 |
| `StdTunnelSelector` | 隧道类型选择 |

### Monitor 模块

| 模块 | 功能 |
|------|------|
| `StdCounter` | 通用计数器 |
| `StdPacketCounter` | 数据包计数器 |
| `StdFlowCounter` | 流计数器 |
| `StdMirror` | 流量镜像 |
| `StdSampler` | 流量采样 |
| `StdLatencyMonitor` | 延迟监控 |
| `StdDropMonitor` | 丢包监控 |
| `StdCongestionMonitor` | 拥塞监控 |
| `StdEventLogger` | 事件日志 |

### NAT 模块

| 模块 | 功能 |
|------|------|
| `StdBasicNat` | 基础 NAT |
| `StdPortNat` | 端口 NAT |
| `StdFullConeNat` | 全锥形 NAT |
| `StdSymmetricNat` | 对称 NAT |

## 标准应用

| 应用 | 功能 |
|------|------|
| `StdSimpleRouter` | 简单路由器 |
| `StdAclFirewall` | ACL 防火墙 |
| `StdL2Switch` | 二层交换机 |
| `StdSimpleLoadBalancer` | 负载均衡器 |
| `StdVtepGateway` | VTEP 网关 |

## 示例

查看以下文件了解更多示例：

- `std_example_router.pne` - 使用标准库构建路由器
- `std_example_switch.pne` - 使用标准库构建交换机
