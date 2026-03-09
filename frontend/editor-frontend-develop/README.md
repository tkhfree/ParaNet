# 集成开发系统

> 基于 `@vigour/scripts` 的 React 项目
>
> 推荐 Node 版本：`20.x`
>
> 当前目录同时包含：
>
> - 前端项目：`editor-frontend-develop`
> - 后端项目：`editor-frontend-develop/editor-backend-dev`
> - 大模型配置文件：`editor-backend-dev/src/main/resources/llm-config.properties`

## 先说结论

这个项目已经改成：

- 公网环境可以直接 `npm install`
- 不再依赖公司内网 `nexus`
- 项目拷贝到别的电脑时，只要把当前项目目录完整带走，就可以继续安装和运行

## 环境要求

- Node.js `20.x`
- npm `10.x` 左右即可
- JDK `8`
- Maven `3.8+` 或 `3.9+`

可先检查版本：

```bash
node -v
npm -v
java -version
mvn -v
```

## 第一次安装

在项目根目录执行：

```bash
npm install
```

说明：

- 项目里的私有 `@vigour/*` 依赖已经本地化到 `vendor/vigour/`
- `.npmrc` 已改为公网源，并开启了 `legacy-peer-deps=true`
- 所以外网环境也可以安装

## 项目结构

当前目录下有两部分：

- 前端：`/Users/tangkaifei/Documents/code/ParaNet/frontend/editor-frontend-develop`
- 后端：`/Users/tangkaifei/Documents/code/ParaNet/frontend/editor-frontend-develop/editor-backend-dev`

其中：

- 前端开发端口默认是 `8000`
- 后端服务端口默认是 `8080`
- 前端通过 `proxy.config.json` 把 `/api/chat` 和 `/api/control-plane` 代理到本地后端

## 后端准备

### 1. 安装 JDK

这个后端项目的 `pom.xml` 里配置的是：

- `java.version=1.8`

所以建议优先安装 `JDK 8`。

安装完成后执行：

```bash
java -version
```

如果没有正常显示 Java 版本，后端无法启动。

### 2. 安装 Maven

安装完成后执行：

```bash
mvn -v
```

如果提示 `command not found: mvn`，说明 Maven 还没装好，后端也无法启动。

## 大模型配置

智能体对话现在的调用链路是：

1. 前端对话栏发送请求到本地后端
2. 后端读取配置文件
3. 后端调用智谱大模型
4. 前端以流式方式显示回复

大模型配置文件在：

```bash
editor-backend-dev/src/main/resources/llm-config.properties
```

你至少要配置这几个字段：

```properties
llm.zhipu.enabled=true
llm.zhipu.api-url=https://open.bigmodel.cn/api/paas/v4/chat/completions
llm.zhipu.api-key=你的智谱APIKey
llm.zhipu.model=glm-4-flash
llm.zhipu.system-prompt=你是集成开发系统中的智能体助手。请结合当前项目、当前文件和用户问题，给出清晰、准确、可执行的回答。
llm.zhipu.temperature=0.7
llm.zhipu.max-tokens=2048
```

字段说明：

- `llm.zhipu.enabled`：是否启用大模型
- `llm.zhipu.api-url`：智谱接口地址
- `llm.zhipu.api-key`：智谱 API Key
- `llm.zhipu.model`：使用的模型名称
- `llm.zhipu.system-prompt`：系统提示词
- `llm.zhipu.temperature`：采样温度
- `llm.zhipu.max-tokens`：最大返回长度

注意：

- 如果 `llm.zhipu.api-key` 为空，后端虽然可以启动，但对话请求会失败
- 这个配置文件是后端读取的，不需要把 API Key 放到前端代码里

## 启动后端

进入后端目录：

```bash
cd /Users/tangkaifei/Documents/code/ParaNet/frontend/editor-frontend-develop/editor-backend-dev
```

启动 Spring Boot：

```bash
mvn spring-boot:run
```

默认情况下：

- 后端端口：`8080`
- 服务上下文：`/api`

所以聊天接口实际地址是：

```bash
http://127.0.0.1:8080/api/chat/message
http://127.0.0.1:8080/api/chat/stream
```

## 本地开发

启动开发环境：

```bash
npm run dev
```

默认访问地址：

- 本机：`http://127.0.0.1:8000`
- 局域网：终端里会显示当前机器对应地址

## 控制面页面入口

当前已经新增了“控制面操作”页面。

你可以通过两种方式进入：

- 在 `项目管理` 页左侧边栏点击“控制面操作”图标
- 直接访问 `http://127.0.0.1:8000/#/control-plane`

说明：

- 之前如果你在 `项目管理` 页面里看不到入口，是因为该页面默认隐藏顶部全局菜单
- 现在入口已经补到 `项目管理` 左侧边栏，和拓扑、智能体、终端入口放在一起

## 控制面模式说明

当前控制面流表能力支持两种模式：

### 1. 本地项目模式

这是默认模式，适合前后端联调、页面开发和结构验证。

特点：

- 不直接下发真实设备
- 流表数据会按项目保存在后端本地
- 不需要额外的 P4Runtime 适配服务

默认保存位置：

```bash
{file.storage.root}/{projectId}/control_plane_flow_tables.json
```

只要下面两个条件有任意一个不满足，就会使用本地项目模式：

- `p4runtime.adapter.enabled=false`
- `p4runtime.adapter.base-url` 为空

### 2. P4Runtime Adapter 模式

这是接真实设备时使用的模式。

特点：

- 前端页面仍然使用统一的控制面操作 UI
- 后端会把页面填写的结构化流表转换为 P4Runtime 风格请求
- 后端通过配置好的 Adapter 地址去读取和写入真实设备流表

注意：

- 当前后端封装的是“P4Runtime 风格的 Adapter 请求”
- 也就是说，后端默认不是直接自己起 gRPC 去连交换机，而是调用你提供的 P4Runtime 适配层 HTTP 接口
- 如果你们后面有固定的 Adapter 协议，我可以继续按真实协议再做一次精确对齐

## 控制面配置

后端新增了这组控制面 / P4Runtime 配置，在：

```bash
editor-backend-dev/src/main/resources/application.properties
```

配置项如下：

```properties
p4runtime.adapter.enabled=false
p4runtime.adapter.base-url=
p4runtime.adapter.read-path=/p4runtime/table-entry/read
p4runtime.adapter.write-path=/p4runtime/table-entry/write
p4runtime.adapter.default-device-id=1
p4runtime.adapter.election-id-high=0
p4runtime.adapter.election-id-low=1
```

字段说明：

- `p4runtime.adapter.enabled`：是否开启 P4Runtime Adapter 模式
- `p4runtime.adapter.base-url`：P4Runtime Adapter 服务地址，例如 `http://127.0.0.1:9559`
- `p4runtime.adapter.read-path`：读取流表接口路径
- `p4runtime.adapter.write-path`：写入流表接口路径
- `p4runtime.adapter.default-device-id`：默认 `device_id`
- `p4runtime.adapter.election-id-high`：默认 `election_id.high`
- `p4runtime.adapter.election-id-low`：默认 `election_id.low`

### 本地项目模式示例

```properties
p4runtime.adapter.enabled=false
p4runtime.adapter.base-url=
```

### P4Runtime Adapter 模式示例

```properties
p4runtime.adapter.enabled=true
p4runtime.adapter.base-url=http://127.0.0.1:9559
p4runtime.adapter.read-path=/p4runtime/table-entry/read
p4runtime.adapter.write-path=/p4runtime/table-entry/write
p4runtime.adapter.default-device-id=1
p4runtime.adapter.election-id-high=0
p4runtime.adapter.election-id-low=1
```

## 控制面流表表单说明

控制面页面里的“新增流表 / 编辑流表”已经升级为标准化结构表单。

现在表单主要由两部分组成：

- `Match Fields`
- `Action`

### 1. Match Fields

每一条匹配字段包含：

- `fieldName`：字段名，例如 `hdr.ipv4.dstAddr`
- `matchType`：匹配类型，例如 `EXACT`、`LPM`、`TERNARY`
- `value`：匹配值
- `mask`：掩码或前缀长度，可选

### 2. Action

动作部分包含：

- `actionName`：动作名称，例如 `set_nhop`
- `actionParams`：动作参数列表，例如 `port=1`

页面会根据这些结构化字段自动生成摘要字符串：

- `matchRule`
- `action`

这样做的好处是：

- 前端填写更标准
- 后端更容易转换成 P4Runtime 风格请求
- 本地项目模式和真实设备模式都能复用同一套页面

## 前后端联调启动顺序

推荐按下面顺序启动：

1. 先启动后端
2. 再启动前端
3. 打开浏览器访问 `http://127.0.0.1:8000`
4. 进入 `项目管理` 页面
5. 点击左侧机器人图标，打开智能体对话栏
6. 如需查看或操作流表，点击左侧“控制面操作”图标进入控制面页面

如果前端已经在运行，而你刚刚修改了：

- `proxy.config.json`
- 后端端口
- 大模型配置

建议把前端也重启一次：

```bash
npm run dev
```

## 智能体对话说明

当前智能体对话功能已经支持：

- 前端流式显示模型回复
- 后端调用智谱模型
- 后端通过工具调用机制编排真实业务接口
- 自动携带当前项目名
- 自动携带当前项目 ID
- 自动携带当前文件名
- 自动携带当前文件 ID
- 自动携带当前文件内容
- 自动携带当前项目文件树摘要
- 聊天框中展示工具调用过程

也就是说，模型在回答时不仅能看到你的问题，还能看到当前项目和当前代码上下文，并且在需要时可以主动调用后端工具执行真实操作。

## Agent 能力说明

当前这套能力已经不只是“普通聊天框”，而是一套基于大模型 + 后端工具调用的项目智能体。

它现在的工作方式是：

1. 前端把用户问题、当前项目、当前文件、文件内容发给后端
2. 后端把这些上下文和工具定义一起发给大模型
3. 大模型判断是否需要调用工具
4. 如果需要，后端执行真实接口
5. 后端把执行结果再回喂给大模型
6. 前端流式显示最终回复，并展示工具调用过程

### 这套 Agent 目前能做的事

#### 1. 项目理解与分析

- 理解当前项目结构
- 读取项目文件树
- 读取当前文件或指定文件内容
- 结合当前代码上下文回答问题
- 根据项目文件树分析该改哪里

#### 2. 文件管理

- 创建文件夹
- 创建文件
- 保存文件内容
- 重命名文件或文件夹
- 移动文件或文件夹
- 删除文件或文件夹

#### 3. 项目管理

- 创建项目
- 更新项目名称和备注

#### 4. 编译与部署

- 查询项目设备列表
- 调用前端编译
- 调用部署接口
- 调用后端编译
- 查询前端编译日志
- 查询部署结果
- 查询后端编译日志

#### 5. 编译产物分析

- 获取最近一次前端编译产物列表
- 读取前端编译产物内容

### Agent 当前已接入的主要工具能力

后端当前已经向模型暴露了这些工具：

- `create_project`
- `update_project`
- `get_project_file_tree`
- `create_project_file`
- `read_project_file`
- `save_project_file`
- `rename_project_file`
- `move_project_file`
- `delete_project_file`
- `list_project_devices`
- `frontend_compile`
- `deploy_project`
- `backend_compile`
- `query_project_log`
- `get_frontend_compile_files`
- `read_frontend_compile_file`

### 在页面里的实际表现

在前端聊天框里，你现在可以看到三类内容：

- 用户消息
- 智能体正式回复
- 工具调用过程提示

例如你会看到：

- `正在调用工具：get_project_file_tree`
- `工具 get_project_file_tree 执行完成`
- `正在调用工具：frontend_compile`

所以它不是只会“口头建议”，而是已经可以通过后端真正操作项目。

### 适合让 Agent 做的事情

你现在可以比较自然地让它做这些事：

- `帮我看看当前项目里有哪些关键文件`
- `帮我解释当前文件的作用`
- `帮我新建一个 p4 文件`
- `把当前文件改成 xxx 内容`
- `帮我把这个文件移动到某个文件夹`
- `帮我触发前端编译`
- `帮我部署到某个设备`
- `帮我查看最近一次后端编译日志`
- `帮我读取最近一次前端编译产物`

### 当前限制

虽然这套 Agent 已经能调用真实接口，但目前仍然有这些限制：

- 危险动作还没有二次确认机制
- 是否执行工具，当前由模型自主判断
- 后端必须正常启动，模型能力才可用
- 智谱 `API Key` 必须正确配置
- 当前还没有长期记忆能力
- 当前没有多步任务审批流

也就是说，它已经是“能操作项目的智能体”，但还不是“带完整审批和权限体系的企业级 Agent”。

## 推荐提问模板

如果你希望 Agent 更准确地理解你的意图，最好直接说明：

- 你想做什么
- 操作对象是谁
- 是否允许它直接执行
- 你希望最后得到什么结果

推荐尽量少说空话，多说目标。

### 1. 理解项目

适合这样问：

- `请先帮我看看当前项目的文件结构，并告诉我主要目录和文件分别是做什么的`
- `请结合当前项目文件树，告诉我这个项目大概是怎么工作的`
- `请帮我分析当前项目里和编译部署最相关的文件有哪些`

### 2. 理解当前文件

适合这样问：

- `请帮我解释当前打开文件的作用`
- `请阅读当前文件，并告诉我它的主要逻辑`
- `请告诉我当前文件里哪些部分最重要，后续改功能应该重点看哪里`

### 3. 读取指定文件

适合这样问：

- `请帮我读取 path.json 的内容，并解释它是干什么的`
- `请帮我读取 topology.json，并总结里面的关键信息`
- `请帮我找一下项目里和部署有关的配置文件，并读取给我看`

### 4. 创建文件或文件夹

适合这样问：

- `请在当前项目根目录下新建一个名为 demo 的文件夹`
- `请在 xxx 文件夹下创建一个名为 test.p4 的文件`
- `请在当前项目中创建一个新的 domain 文件，名字叫 sample，内容先留空`

如果你希望它直接写入初始内容，可以这样问：

- `请在当前项目根目录下创建一个名为 demo.p4 的文件，并把以下内容写进去：...`

### 5. 修改文件

适合这样问：

- `请把当前文件内容改成下面这段：...`
- `请帮我修改当前文件，在末尾增加以下内容：...`
- `请读取当前文件后，按我的要求修改，并直接保存`
- `请把 xxx 文件重命名为 yyy`
- `请把 xxx 文件移动到 demo 文件夹下`

### 6. 删除文件

适合这样问：

- `请删除当前项目中的 xxx 文件`
- `请删除 demo 文件夹`
- `请帮我删除这个无用文件，如果删除前有风险请先提醒我`

### 7. 项目管理

适合这样问：

- `请帮我创建一个新项目，名称叫 demo_project`
- `请把当前项目名称改成 xxx`
- `请把当前项目备注改成：这是一个用于测试 Agent 的项目`

### 8. 编译与部署

适合这样问：

- `请帮我触发当前项目的前端编译`
- `请先列出当前项目的设备名称和 IP`
- `请把当前项目部署到设备 xxx`
- `请在部署完成后继续执行后端编译`
- `请对当前项目执行前端编译、部署、后端编译，并把每一步结果告诉我`

### 9. 查询日志

适合这样问：

- `请帮我查看当前项目最近一次前端编译日志`
- `请帮我查看设备 xxx 的后端编译日志`
- `请帮我查看设备 xxx 的部署结果`
- `请把最近一次编译失败的原因总结给我`

### 10. 查看编译产物

适合这样问：

- `请列出当前项目最近一次前端编译生成了哪些产物`
- `请帮我读取最近一次前端编译产物里某个 json 文件的内容`
- `请帮我分析最近一次前端编译产物中最关键的几个文件`

### 11. 先分析，再执行

如果你不想让它一上来就改东西，可以这样问：

- `请先分析，不要直接修改文件`
- `请先告诉我应该怎么改，等我确认后再执行`
- `请先检查当前项目结构，再给我操作建议，不要直接部署`

### 12. 更容易成功的提问方式

推荐你尽量这样描述：

- `请帮我做什么`
- `对象是谁`
- `如果涉及设备，请给出设备名`
- `如果涉及文件，请给出文件名`
- `如果希望直接执行，就明确说“请直接执行”`

例如：

- `请直接读取 path.json，并告诉我里面有哪些设备`
- `请直接在当前项目根目录创建一个 demo 文件夹`
- `请直接触发当前项目前端编译，并把日志返回给我`
- `请先分析当前文件，再告诉我应该怎么修改，不要直接保存`

### 13. 不推荐的问法

下面这种问法太模糊，Agent 成功率会下降：

- `帮我搞一下`
- `你看着改`
- `帮我处理这个项目`
- `我想优化一下`

更好的写法是：

- `请读取当前文件，并帮我说明哪里可以优化`
- `请查看项目文件树后，告诉我新增一个 p4 文件应该放在哪`
- `请直接把当前项目部署到设备 xxx，并返回部署结果`

## 联调时最常见的问题

### 1. 前端能打开，但智能体对话失败

优先检查：

- 后端是否已经启动
- `llm-config.properties` 里是否已经填写 `llm.zhipu.api-key`
- 后端是否监听在 `8080`
- 前端是否已经重启过
- 智能体请求经过的 `/api/chat` 代理是否正常

### 2. 执行 `mvn spring-boot:run` 失败

优先检查：

- `java -version` 是否正常
- `mvn -v` 是否正常
- 当前目录是否是 `editor-backend-dev`

### 3. 对话没有返回内容

优先检查：

- 智谱 `API Key` 是否正确
- 模型名是否可用，例如 `glm-4-flash`
- 当前网络是否能访问 `https://open.bigmodel.cn`
- 后端是否已经成功读取到项目上下文

### 4. 前端提示接口错误

可以先看这两边：

- 前端运行终端
- 后端运行终端

通常以后端日志更关键，因为智谱调用是在后端发起的。

### 5. 工具调用有提示，但执行失败

优先检查：

- 当前项目是否已经选中
- 当前文件是否真实存在
- 如果是部署或后端编译，项目里是否存在 `path.json`
- 设备名称是否和项目里的设备名称完全一致
- 如果是编译产物读取，是否已经有最近一次前端编译记录

## 生产打包

```bash
npm run build
```

打包产物默认在：

```bash
dist/
```

## 拷贝到别的电脑怎么用

把整个 `editor-frontend-develop` 目录完整拷走，尤其不要漏掉这些内容：

- `package.json`
- `package-lock.json`
- `.npmrc`
- `vendor/`
- `src/`

然后在新电脑上执行：

```bash
npm install
npm run dev
```

注意：

- 不需要再拷贝旧的 `node_modules`
- 不需要连接公司 VPN
- 只要 `vendor/` 在，私有依赖就能正常安装

## 常见问题

### 1. `npm install` 失败怎么办

优先检查：

- Node 是否是 `20.x`
- 当前目录是否正确
- `vendor/vigour/` 是否还在
- 是否误删了 `.npmrc`

如果想强制重装，可以执行：

```bash
rm -rf node_modules package-lock.json
npm install
```

然后再运行：

```bash
npm run dev
```

### 2. 启动后端口被占用怎么办

如果 `8000` 端口被占用，可以先结束旧进程，再重新运行：

```bash
npm run dev
```

如果是后端 `8080` 端口被占用，需要先结束旧的 Java 进程，再重新执行：

```bash
cd /Users/tangkaifei/Documents/code/ParaNet/frontend/editor-frontend-develop/editor-backend-dev
mvn spring-boot:run
```

### 3. 终端里还有 ESLint 提示怎么办

当前项目已经处理到“可以正常安装、构建、运行”。
如果后续你想继续做代码洁净优化，再单独处理业务代码里的 lint 规则即可。

### 4. 后端启动后对话接口报错怎么办

优先检查：

- `editor-backend-dev/src/main/resources/llm-config.properties`
- `llm.zhipu.api-key` 是否为空
- 智谱接口地址是否能访问
- 模型名是否填写正确

### 5. Agent 能聊天，但不会执行项目操作怎么办

优先检查：

- 后端是否是最新代码
- 聊天接口是否走的是当前项目里的 `editor-backend-dev`
- 后端日志里是否有工具调用异常
- 当前问题是否足够明确，例如：
  - `请帮我读取当前文件内容`
  - `请帮我创建一个名为 demo 的文件夹`
  - `请帮我触发前端编译`
  - `请帮我查询最近一次后端编译日志`

## 推荐 VS Code 插件

- `ESLint`
- `Prettier - Code formatter`
- `Stylelint`
- `CSS Modules`

## 推荐 VS Code 设置

在 `settings.json` 中加入：

```json
"editor.formatOnSave": true,
"editor.fontLigatures": true,
"svelte.enable-ts-plugin": true,
"explorer.confirmDelete": false,
"prettier.jsxSingleQuote": true,
"prettier.requireConfig": true,
"prettier.semi": false,
"prettier.singleQuote": true,
"prettier.arrowParens": "avoid",
"editor.codeActionsOnSave": {
  "source.fixAll": true
}
```
