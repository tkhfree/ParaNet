# Lynette 当前项目总结

## 1. 项目本质

Lynette 是一个面向网络拓扑的 DSL 编译器。它把 PNE（Programmable Network Element）程序编译成面向单个设备的 P4 程序，但编程视角不是“单台设备”，而是“整个服务路径和网络拓扑”。

可以把它概括为：

`PNE DSL -> AST -> 语义 IR -> P4 fragment -> 按路径聚合到节点 -> 输出每节点 P4/entry`

这也是它和普通 P4 工程的最大区别：

- 普通 P4：直接对单个交换机编程
- Lynette：先描述全网处理逻辑，再由编译器把逻辑切分并投放到各节点

## 2. 项目结构

仓库中与编译器主流程直接相关的目录和文件如下。

### 根目录

- `README.md`
  项目总说明和语法简介。
- `ARCHITECTURE.md`
  对编译阶段和模块职责的总结。
- `PATH_GENERATOR_GUIDE.md`
  `path.json` 自动生成逻辑说明。
- `generate_path.py`
  独立路径生成脚本。
- `setup.py`
  Python 包安装信息。

### 主包 `lynette/`

- `lynette/__main__.py`
  主入口，负责 CLI 参数、debug/service 两种模式、编译调用和可选部署。
- `lynette/deploy.py`
  原始 TCP 文件下发脚本。
- `lynette/component/`
  编译中间产物目录，不是“源码逻辑层”，但当前实现高度依赖这个目录在阶段之间传递数据。
- `lynette/lynette_lib/`
  真正的编译器实现。

### 核心库 `lynette/lynette_lib/`

- `grammar/`
  PNE 语法定义。
- `parser_tree.py`
  解析入口文件及 include/domain 依赖，构造语法森林。
- `collect.py`
  从 AST 提取 service/application/module 等语义对象。
- `data_structure.py`
  内部 IR 和辅助结构定义。
- `generate.py`
  把 IR 降低为片段化 P4 中间代码。
- `aggregate.py`
  基于 `path.json` 和节点资源分配 fragment，并生成节点级 header/parser/deparser/control/entry。
- `output.py`
  把节点级中间产物输出为最终 P4 和表项文件。
- `path_generator.py`
  根据 `service.json` 和 `topology.json` 自动生成 `path.json`。

### 示例输入 `input/`

- `Alice_main.pne`
- `Bob_main.pne`
- `module_lib/*.pne`
- `include/define.pne`
- `include/header.pne`
- `include/parser.pne`
- `IPv4_example/`
- `IPv6_example/`
- `GEO_example/`
- `NDN_example/`

这些样例说明项目并不是一个单一 demo，而是希望覆盖多种协议或场景。

## 3. 运行模式与主入口

项目的程序入口在 `lynette/__main__.py`。安装后主要通过下面的形式使用：

```bash
python -m lynette --config service.json
```

也支持 debug 单文件模式：

```bash
python -m lynette --debug-main Alice_main.pne
```

编译流程由 `LynetteRunner.run()` 协调，主顺序如下：

1. 清理 `component/`
2. debug 模式下预处理主文件
3. 读取或生成 `service.json`
4. `parser_tree.execute()`
5. `collect.execute()`
6. `Generator.execute()`
7. `aggregate.execute()`
8. `output.execute()`
9. 可选 `deploy_code()` / `deploy_entry()`

## 4. 对外接口

当前仓库中**没有 HTTP API，也没有 MCP server/tool 实现**。真正可用的对外接口只有以下几类。

### 4.1 编译 CLI

入口：`python -m lynette`

参数包含：

- `--config`
- `--log-dir`
- `--output-dir`
- `--debug-main`
- `--verbosity`
- `--clean`
- `--target`
- `--entry`
- `--p4`
- `--check`
- `--deploy`

但要注意：

- `--target` 在 CLI 中存在，当前代码里没有真正贯穿到后端逻辑
- 实际后端选择更依赖 `path.json` 中节点的 `resource`

### 4.2 路径生成 CLI

入口：`python generate_path.py`

输入：

- `service.json`
- `topology.json`
- 可选输出路径

输出：

- `path/path.json`

### 4.3 部署接口

入口：

- `python -m lynette --deploy`
- `python -m lynette --entry`
- `python -m lynette.deploy --config xxx --ip x.x.x.x --port 13345`

协议：

- 原始 TCP
- 先发文件名
- 收 ACK
- 再按块发送内容

不是 HTTP，不是 gRPC，也不是 P4Runtime 封装。

## 5. PNE 语言概览

PNE 的设计目标是让用户在“网络拓扑层面”表达业务逻辑，再由编译器映射到节点程序。

### 5.1 顶层结构

PNE 文件通常由以下部分构成：

- `#include`
- `using Parser`
- `service`
- `application`
- `module`

### 5.2 关键抽象

#### `service`

定义应用调用链，例如：

```pne
service[ServiceName] {
    app1 -> app2 -> app3
}
```

它描述的是“服务级处理流程”。

#### `application`

应用层容器，负责组合 module 或更简单的业务逻辑。

#### `module`

可复用组件，通常包含：

- `parser`
- `control`

这是最核心的网络功能封装单元。

#### `parser`

不是完整自定义状态机，而是声明当前模块依赖哪些头部。

#### `control`

编写控制逻辑，包括：

- 赋值
- 模块调用
- map/set/register
- 条件
- switch
- 原语

### 5.3 已声明的语法能力

在 `grammar.py` 中可以看到语言层面声明了：

- `if/else`
- `switch`
- `map`
- `set`
- `reg`
- `tuple`
- `func`
- `for`
- `while`
- 逻辑运算
- 位运算
- 表达式

### 5.4 实际编译链已稳定支持的子集

需要特别注意，当前工程的“语法声明范围”大于“后续 pass 真正支持的范围”。

从 `collect.py` 和 `generate.py` 看，稳定进入主链的主要是：

- `ins_assign`
- `ins_call`
- `if`
- `primitive`
- `ins_cul`
- `switch`
- `map`
- `set`
- `reg`
- `func`
- `assert`

而 grammar 中出现的：

- `for_loop`
- `while_loop`
- `logical_and`
- `logical_or`
- 更完整的表达式/位运算

并没有在后续语义收集与代码生成中形成完整闭环。因此新项目不能简单把 `grammar.py` 当作“已实现语义全集”。

## 6. 输入文件模型

### 6.1 `service.json`

当前项目事实上的结构大致如下：

```json
{
  "Alice": {
    "services": [
      {
        "service_name": "admin_1",
        "applications": ["Router"],
        "service_hosts": [
          { "device_uuid": "s1", "ports": { "h1": 21 } },
          { "device_uuid": "s2", "ports": { "h2": 22 } }
        ]
      }
    ]
  }
}
```

作用：

- 绑定用户/主文件与服务
- 定义服务名
- 定义应用链
- 为自动路径生成和最终出口端口回填提供服务主机信息

### 6.2 `topology.json`

由路径生成器使用，最少需要：

- `links`
- `deviceStaticInfo`

作用：

- 构建网络图
- 用 BFS 找最短路径
- 推断默认设备表容量

### 6.3 `path.json`

编译聚合阶段的核心输入。结构大致如下：

```json
{
  "admin_1": {
    "s1": {
      "next": { "s2": 2 },
      "tables": 6,
      "ip": "192.168.0.1",
      "resource": "CPU"
    },
    "s2": {
      "next": {},
      "tables": 8,
      "ip": "192.168.0.2",
      "resource": "ASIC"
    }
  }
}
```

作用：

- 规定服务路径上的节点顺序
- 规定节点下一跳与端口
- 提供表资源预算
- 提供部署 IP
- 提供后端类型

## 7. 输出产物

最终输出通常为：

- `{node}.p4`
- `{node}_entry.json`
- `{node}_entry.py`

其中：

- `CPU` 节点输出 `v1model.p4` 风格程序和 JSON entry
- `ASIC` 节点输出 `tna.p4` 风格程序和 Python 下发表项脚本

## 8. 编译原理

### 8.1 前端：PNE -> AST

`parser_tree.py` 做三件事：

1. 读取入口文件
2. 展开 `#include`
3. 解析 `.domain`

这里存在一个历史实现技巧：

- 在解析 domain 前把 `"` 替换成 `>-<`
- 解析后再还原

这是为了绕过当时的 include/domain 语法处理问题，不应作为新项目推荐方案。

### 8.2 语义收集：AST -> IR

`collect.py` 从语法树提取：

- service
- application
- module
- instruction
- condition

它依赖 `data_structure.py` 中的弱类型对象，例如：

- `LYNETTE_SERVICE`
- `LYNETTE_APP`
- `LYNETTE_MODULE`
- `LYNETTE_INS`
- `LYNETTE_CONDITION`

### 8.3 中端 lowering：IR -> fragment

`generate.py` 的核心思想不是“直接输出完整 P4”，而是先拆成很多 fragment。

每个 fragment 可能对应这些中间文件：

- `_var.pne`
- `_control.pne`
- `_action.pne`
- `_table.pne`
- `_reg.pne`
- `_entry.pne`
- `_tem.pne`

这是项目最值得保留的思想之一，因为它使“程序逻辑切分”和“设备部署放置”分离。

### 8.4 优化：单表优化

`if` 和 `switch` 会先尝试转成单个 table + 多个 action。

这类优化的意义在于：

- 更适合 P4 的执行模型
- 减少命令式展开
- 便于直接生成 entry

### 8.5 聚合：fragment -> node

`aggregate.py` 按 `path.json` 中的服务路径、节点资源限制进行片段放置。

当前算法的特征：

- 启发式贪心
- 不是全局最优
- head/tail 片段优先
- 中间片段在资源足够时顺序塞入

### 8.6 后端：node plan -> P4

`output.py` 完成最终输出：

- 拼 header
- 拼 parser
- 拼 ingress control
- 拼 deparser
- 根据 `CPU/ASIC` 做后端映射

它使用的是“后端模板 + 关键符号替换”模式，而不是严格抽象的后端接口。

## 9. 当前项目最有价值的设计

如果要在新工程中继承，这几个思想最值得保留：

- 面向网络拓扑的 DSL 目标
- 编译器式分层流水线
- Typed-ish IR 到 fragment 的 lowering 思路
- 拓扑感知的 fragment 放置
- 节点级 parser/header/deparser 裁剪
- 多后端输出思路

## 10. 当前项目最明显的问题

这些是新工程中最应该避免照搬的部分。

- 以文件系统中间文件作为主要 IR 总线
- 依赖字符串替换 hack 处理 include/domain
- 大量 `children[i]` 弱约束 AST 访问
- 错误处理偏 `print + exit()`
- 语法定义、文档说明、后续 pass 支持范围存在漂移
- CLI 参数与真实后端行为并不完全一致

## 11. 对新项目的结论

新项目应把当前工程当作：

- 语义原型
- 编译流程参考
- 输入输出 contract 的来源

而不应当把它当作：

- 结构完备的可直接复用代码库
- 可以原样迁移的工程模板

一句话总结：

Lynette 当前工程最值得保留的是“PNE -> IR -> fragment -> placement -> per-node backend”这条骨架，最值得重写的是“文件拼接、字符串 hack、弱类型 AST 遍历”这三类实现方式。
