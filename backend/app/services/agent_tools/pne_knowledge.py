"""PNE DSL knowledge base for the agent.

Provides a concise PNE syntax reference and example snippets that are injected
into the agent system prompt so the LLM can generate valid PNE files.
"""

# Keep this as a single f-string-ready constant so it can be embedded directly
# into the system prompt without extra formatting work.

PNE_DSL_REFERENCE = """\
## PNE DSL 语法参考（必须严格遵守）

PNE (Programmable Network Element) 是 ParaNet 的领域特定语言，用于描述可编程网络数据面行为。

### 绝对禁止的语法（PNE 不是 JavaScript/Python/C）

- 禁止使用 `let`, `var`, `const`, `function`, `async`, `await`
- 禁止使用 `forwardTo()`, `console.log()`, `print()` 等函数
- 禁止使用数组切片如 `packet[0:20]`
- 禁止使用字符串如 `"node_xxx"`, `"hello"`
- 禁止使用 JavaScript 对象语法
- 禁止在 module 外部写可执行语句

### PNE 只允许以下结构

PNE 文件由三种顶级声明组成，按需组合：

1. `module ... { parser {...} control {...} }`
2. `application ... using ... { bit<N> var = 0; control {...} }`
3. `service [...] { App1 -> App2 }`
4. `intent { route R1 { from: ... to: ... } }`（可选）

### 数据类型（PNE 仅支持这些）

只有 `bit<N>` 类型和基于它的容器：
- `bit<8>`, `bit<16>`, `bit<32>`, `bit<48>`, `bit<1>` — 无符号整数
- `static map<bit<K>, bit<V>>[Size] name;` — 静态映射表
- `map<bit<K>, bit<V>>[Size] name;` — 动态映射表

变量声明方式：`bit<32> myvar = 0;`

### module 定义格式（严格模板）

```pne
module ModuleName() {
    parser {
        hdr.ipv4;    // 声明要解析的报文头
    }
    control {
        // 只允许：变量声明、映射表声明、赋值、if/else、函数调用
        static map<bit<32>, bit<32>>[1024] route_table;
        route_table[0x0A000001] = 0x0A000002;
    }
}
```

### application 定义格式（严格模板）

```pne
application MyApp using StdCombinedParser {
    bit<32> nexthop = 0;
    bit<16> egress_port = 0;
    bit<1> should_drop = 0;

    control {
        if (!hdr.ipv4.isValid()) {
            drop();
            return;
        }
        nexthop = route_table[hdr.ipv4.dst];
        if (nexthop == 0) { drop(); return; }
    }
}
```

### 报文头字段访问（只通过 hdr 对象）

- `hdr.ipv4.src` — 源 IP 地址 (bit<32>)
- `hdr.ipv4.dst` — 目的 IP 地址 (bit<32>)
- `hdr.ipv4.protocol` — 协议号 (bit<8>)
- `hdr.ipv4.ttl` — TTL (bit<8>)
- `hdr.ipv4.isValid()` — 检查报文头是否有效
- `hdr.ethernet.src` / `hdr.ethernet.dst` — MAC 地址 (bit<48>)
- `hdr.tcp.src_port` / `hdr.tcp.dst_port` — TCP 端口 (bit<16>)
- `gmeta.ingress_port` — 入端口 (bit<16>)

### 内置动作（只有这两个）

- `drop()` — 丢弃报文
- `return` — 退出当前 control 块

### 运算符

- 比较: `==` `!=` `>=` `<=` `>` `<`
- 逻辑: `&&` `||` `!`
- 算术: `+` `-` `*` `/` `%`
- 十六进制: `0x0A000001`

### 意图块格式

```pne
intent {
    route R1 {
        from: prefix({ kind: "cidr", value: "10.0.0.0/8" })
        to: edge-1
        via: core-1, edge-1
        protocol: ip
    }
}
```

### 常见场景的完整示例

#### 示例1: 最简单的 IPv4 解析模块

```pne
module IPv4Parser() {
    parser {
        hdr.ipv4;
    }
    control {
        ;
    }
}
```

#### 示例2: 带路由查找的路由器

```pne
module MyRouteTable() {
    parser { hdr.ipv4; }
    control {
        static map<bit<32>, bit<32>>[256] route_table;
        route_table[0x0A000000] = 0x0A000001;
        route_table[0x0B000000] = 0x0B000001;
    }
}

application MyRouter using StdCombinedParser {
    bit<32> nexthop = 0;

    control {
        if (!hdr.ipv4.isValid()) {
            drop();
            return;
        }
        nexthop = MyRouteTable.route_table[hdr.ipv4.dst];
        if (nexthop == 0) {
            drop();
            return;
        }
    }
}

service [RouterService] { MyRouter }
```

#### 示例3: 带 ACL 的交换机

```pne
#include <std/std.pne>

module MyAcl() {
    parser { hdr.ipv4; }
    control {
        static map<bit<32>, bit<8>>[256] acl_table;
    }
}

application MySwitch using StdCombinedParser {
    bit<8> acl_action = 0;

    control {
        if (!hdr.ipv4.isValid()) { drop(); return; }

        acl_action = MyAcl.acl_table[hdr.ipv4.src];
        if (acl_action == 1) { drop(); return; }
    }
}

service [SwitchService] { MySwitch }
```
"""
