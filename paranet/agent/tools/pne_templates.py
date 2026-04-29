"""PNE DSL preset templates for create_from_template tool."""
from __future__ import annotations

TEMPLATES: dict[str, dict[str, str]] = {
    "ipv4_parser": {
        "name": "IPv4 解析模块",
        "description": "最简单的 IPv4 报文头解析模块",
        "content": """\
// IPv4 报文头解析模块
module IPv4Parser() {
    parser {
        hdr.ipv4;
    }
    control {
        ;
    }
}
""",
    },
    "ipv4_forwarder": {
        "name": "IPv4 转发模块",
        "description": "基本的 IPv4 转发模块，包含有效性检查",
        "content": """\
// IPv4 转发模块
module IPv4Forwarder() {
    parser {
        hdr.ipv4;
    }
    control {
        ;
    }
}

application ForwarderApp using StdCombinedParser {
    bit<32> nexthop = 0;

    control {
        // 检查 IPv4 头是否有效
        if (!hdr.ipv4.isValid()) {
            drop();
            return;
        }
    }
}

service [ForwarderService] { ForwarderApp }
""",
    },
    "simple_router": {
        "name": "简单路由器",
        "description": "带静态路由表的路由器",
        "content": """\
// 简单路由器 —— 带静态路由表
module RouteTable() {
    parser { hdr.ipv4; }
    control {
        // 静态路由表: 目的IP -> 下一跳IP
        static map<bit<32>, bit<32>>[256] routes;
    }
}

application Router using StdCombinedParser {
    bit<32> nexthop = 0;

    control {
        // 1. 校验 IPv4 头
        if (!hdr.ipv4.isValid()) {
            drop();
            return;
        }

        // 2. 路由查找
        nexthop = RouteTable.routes[hdr.ipv4.dst];
        if (nexthop == 0) {
            drop();
            return;
        }
    }
}

service [RouterService] { Router }
""",
    },
    "l2_switch": {
        "name": "二层交换机",
        "description": "基于 MAC 地址表的二层交换机",
        "content": """\
// 二层交换机 —— 基于 MAC 地址表
#include <std/std.pne>

module MacTable() {
    parser { hdr.ethernet; }
    control {
        // MAC 地址表: MAC -> 端口
        static map<bit<48>, bit<16>>[8192] mac_table;
    }
}

application Switch using StdEthernetParser {
    bit<16> egress_port = 0;
    bit<1> lookup_hit = 0;

    control {
        // MAC 查找
        StdMacLookup.apply(hdr.ethernet.dst, 0, egress_port, lookup_hit);

        if (lookup_hit == 1) {
            // 命中，单播转发
        } else {
            // 未命中，泛洪
            StdL2Flood.apply(0, gmeta.ingress_port, _, _);
        }
    }
}

service [SwitchService] { Switch }
""",
    },
    "acl_firewall": {
        "name": "ACL 防火墙",
        "description": "基于访问控制列表的防火墙",
        "content": """\
// ACL 防火墙
module AclTable() {
    parser { hdr.ipv4; }
    control {
        // ACL 规则表: 源IP -> 动作 (0=允许, 1=拒绝)
        static map<bit<32>, bit<8>>[256] acl_rules;
    }
}

application Firewall using StdCombinedParser {
    bit<8> acl_action = 0;

    control {
        // 1. 校验报文
        if (!hdr.ipv4.isValid()) {
            drop();
            return;
        }

        // 2. ACL 检查
        acl_action = AclTable.acl_rules[hdr.ipv4.src];
        if (acl_action == 1) {
            drop();
            return;
        }
    }
}

service [FirewallService] { Firewall }
""",
    },
    "intent_route": {
        "name": "意图路由策略",
        "description": "带意图覆盖块的路由策略文件",
        "content": """\
// 意图路由策略
module Forwarder() {
    parser {
        ipv4;
    }
    control {
        ;
    }
}

intent {
    route default_route {
        from: prefix({ kind: "cidr", value: "10.0.0.0/8" })
        to: edge-1
        via: core-1, edge-1
        protocol: ip
    }
}
""",
    },
    "empty": {
        "name": "空模块",
        "description": "最基础的空 PNE 模块，可作为起点",
        "content": """\
// 空模块
module EmptyModule() {
    parser {
        ;
    }
    control {
        ;
    }
}
""",
    },
}


def get_template_names() -> list[str]:
    return list(TEMPLATES.keys())


def get_template(template_id: str) -> dict[str, str] | None:
    return TEMPLATES.get(template_id)
