# Workspace 与项目上下文智能体接口契约

## 目标

为新前端中的 `项目工作台` 与 `项目上下文智能体` 提供统一的后端资源模型，替代老前端历史接口：

- 旧项目接口：`/project/*`
- 旧文件接口：`/file/*`
- 旧智能体接口：`/chat/*`

当前前端已通过适配层兼容并本地 mock 部分能力，后端后续应按本文档逐步补齐。

## 设计原则

1. 使用资源化接口，避免继续沿用动作式命名。
2. 保持与当前新前端已有接口风格一致，统一走 `/api/...`。
3. 前端页面仅依赖新语义接口，不再感知旧接口地址。
4. 保留流式智能体接口，兼容工具调用与上下文透传。

## 1. Workspace 资源接口

### 1.1 项目列表

- 方法：`GET /api/workspace/projects`
- 用途：获取工作台项目列表

响应示例：

```json
{
  "code": 0,
  "message": "ok",
  "data": [
    {
      "id": "demo-project",
      "name": "ParaNet Demo Project",
      "remark": "前端迁移阶段示例项目",
      "createdAt": "2026-03-10T10:00:00Z",
      "updatedAt": "2026-03-10T10:00:00Z"
    }
  ]
}
```

### 1.2 新建项目

- 方法：`POST /api/workspace/projects`

请求体：

```json
{
  "name": "My Project",
  "remark": "optional"
}
```

### 1.3 获取项目文件树

- 方法：`GET /api/workspace/projects/{projectId}/files`
- 用途：返回树形文件结构

响应体中的文件节点建议统一为：

```json
{
  "id": "file-1",
  "projectId": "demo-project",
  "parentId": "root-folder",
  "name": "intent.dsl",
  "type": "dsl",
  "isFolder": false,
  "content": null,
  "createdAt": "2026-03-10T10:00:00Z",
  "updatedAt": "2026-03-10T10:00:00Z",
  "children": []
}
```

### 1.4 新建文件 / 文件夹

- 方法：`POST /api/workspace/files`

请求体：

```json
{
  "projectId": "demo-project",
  "parentId": "root-folder",
  "name": "README.md",
  "type": "markdown",
  "content": "# hello"
}
```

说明：

- `type = folder` 时可忽略 `content`
- 后端应校验同目录重名

### 1.5 读取文件详情

- 方法：`GET /api/workspace/files/{fileId}`
- 用途：工作台打开标签页时读取内容

### 1.6 保存文件内容

- 方法：`PUT /api/workspace/files/{fileId}`

请求体：

```json
{
  "content": "new content"
}
```

### 1.7 重命名文件 / 文件夹

- 方法：`PATCH /api/workspace/files/{fileId}`

请求体：

```json
{
  "name": "new-name.dsl"
}
```

### 1.8 删除文件 / 文件夹

- 方法：`DELETE /api/workspace/files/{fileId}`

约定：

- 删除文件夹时，后端应支持递归删除
- 返回值可为 `null`

## 2. 项目上下文智能体接口

### 2.1 流式对话

- 方法：`POST /api/agent/project-assistant/stream`
- 返回：`text/event-stream`

请求体：

```json
{
  "projectId": "demo-project",
  "projectName": "ParaNet Demo Project",
  "currentFileId": "file-1",
  "currentFileName": "intent.dsl",
  "currentFileContent": "intent route_demo {...}",
  "topologyId": "topology-1",
  "messages": [
    {
      "role": "user",
      "content": "帮我解释当前文件"
    }
  ]
}
```

事件流格式建议：

```text
event: delta
data: {"content":"当前文件主要定义了..."}

event: tool
data: {"message":"正在调用工具：read_workspace_file"}

event: done
data: {"content":"当前文件主要定义了..."}
```

### 2.2 同步对话

- 方法：`POST /api/agent/project-assistant/message`
- 用途：后续补全非流式调用、回放、测试或移动端场景

## 3. Workspace 控制台 / 终端接口

### 3.1 历史日志

- 方法：`GET /api/workspace/terminal/logs`

查询参数：

- `projectId?: string`
- `nodeId?: string`
- `lines?: number`

说明：

- 当前前端暂时兼容使用 `/api/monitor/terminal/logs`
- 后续建议为工作台与监控中心拆分语义

### 3.2 实时终端 WebSocket

- 方法：`WS /ws/workspace/terminal`

建议查询参数：

- `projectId`
- `nodeId`
- `sessionId`

消息格式建议：

客户端发送：

```json
{
  "type": "input",
  "data": "ls\n"
}
```

服务端返回：

```json
{
  "type": "output",
  "data": "README.md\nsrc\n"
}
```

可选控制消息：

```json
{
  "type": "status",
  "status": "connected"
}
```

## 4. 与老接口映射关系

| 新接口 | 老接口 | 说明 |
| --- | --- | --- |
| `GET /api/workspace/projects` | `GET /project/projectList` | 项目列表 |
| `POST /api/workspace/projects` | `POST /project/createProject` | 创建项目 |
| `GET /api/workspace/projects/{id}/files` | `GET /file/tree/{projectId}` | 文件树 |
| `GET /api/workspace/files/{id}` | `GET /file/readFile/{fileId}` | 文件内容 |
| `PUT /api/workspace/files/{id}` | `POST /file/updateFileContent` | 保存文件 |
| `PATCH /api/workspace/files/{id}` | `POST /file/renameFile` | 重命名 |
| `DELETE /api/workspace/files/{id}` | `POST /file/delete` | 删除 |
| `POST /api/agent/project-assistant/stream` | `POST /api/chat/stream` | 项目上下文智能体流式接口 |

## 5. 推荐实施顺序

1. 后端先补 `GET /api/workspace/projects`
2. 再补 `GET /api/workspace/projects/{projectId}/files`
3. 再补 `GET/PUT/PATCH/DELETE /api/workspace/files/{fileId}`
4. 最后补 `POST /api/agent/project-assistant/stream`
5. 实时终端 `WS /ws/workspace/terminal` 最后接入
