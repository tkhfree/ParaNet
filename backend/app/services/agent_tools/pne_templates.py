"""PNE DSL 预置模板 —— 用于 create_pne_from_template 工具。

模板由开发者维护，保证语法 100% 正确。
LLM 只需选择模板和填写参数，不直接编写 PNE 代码。
"""

from __future__ import annotations

from typing import Any

from app.services.agent_tools import register_tool

# ---------------------------------------------------------------------------
# 模板定义
# ---------------------------------------------------------------------------

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
    """Return all available template IDs."""
    return list(TEMPLATES.keys())


def get_template(template_id: str) -> dict[str, str] | None:
    return TEMPLATES.get(template_id)


# ---------------------------------------------------------------------------
# Tool schema & executor
# ---------------------------------------------------------------------------

_TEMPLATE_LIST = "\n".join(
    f"  - `{tid}`: {t['description']}"
    for tid, t in TEMPLATES.items()
)

_CREATE_PNE_SCHEMA = {
    "type": "function",
    "function": {
        "name": "create_pne_from_template",
        "description": (
            "根据预置模板创建 PNE 文件。这是创建 .pne 文件的推荐方式。"
            "可用模板:\n" + _TEMPLATE_LIST
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "projectId": {"type": "string", "description": "项目 ID"},
                "fileName": {
                    "type": "string",
                    "description": "文件名，需以 .pne 结尾，例如 router.pne",
                },
                "templateId": {
                    "type": "string",
                    "description": "模板 ID，从可用模板列表中选择",
                    "enum": list(TEMPLATES.keys()),
                },
                "parentId": {"type": "string", "description": "父文件夹 ID，不传则放在根目录"},
            },
            "required": ["projectId", "fileName", "templateId"],
        },
    },
}


def _create_pne_from_template(
    projectId: str,
    fileName: str,
    templateId: str,
    parentId: str | None = None,
    **_kwargs: Any,
) -> dict[str, Any]:
    from app.services import editor_file_service
    from app.services.agent_tools._file_utils import auto_rename

    tmpl = get_template(templateId)
    if tmpl is None:
        return {"error": f"未知模板: {templateId}，可用模板: {', '.join(TEMPLATES.keys())}"}

    # Ensure .pne extension
    if not fileName.endswith(".pne"):
        fileName += ".pne"

    try:
        result = editor_file_service.create_file(
            project_id=projectId,
            file_name=fileName,
            is_folder=0,
            file_type=2,
            content=tmpl["content"],
            **({"parent_id": parentId} if parentId else {}),
        )
    except ValueError as exc:
        err_msg = str(exc)
        if "同名文件" in err_msg:
            new_name = auto_rename(projectId, fileName)
            result = editor_file_service.create_file(
                project_id=projectId,
                file_name=new_name,
                is_folder=0,
                file_type=2,
                content=tmpl["content"],
                **({"parent_id": parentId} if parentId else {}),
            )
            fileName = new_name
        else:
            return {"error": err_msg}

    if isinstance(result, dict) and "error" in result:
        return result

    return {
        "message": f"已基于模板 '{tmpl['name']}' 创建文件 {fileName}",
        "templateId": templateId,
        "templateName": tmpl["name"],
        "content": tmpl["content"],
        **(result if isinstance(result, dict) else {}),
    }


register_tool("create_pne_from_template", _CREATE_PNE_SCHEMA, _create_pne_from_template)
