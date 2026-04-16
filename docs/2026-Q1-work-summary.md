# ParaNet 2026 年第一季度工作总结

**时间范围：** 2026.02 – 2026.03
**总提交数：** 40 次 | **参与人员：** 6 人

---

## 一、项目初始化与基础架构搭建

完成了 ParaNet 从零到一的架构搭建。定义了 NodeType / LinkType / ProtocolType 等核心数据模型；搭建了 FastAPI 后端服务（REST API + WebSocket）与 React + TypeScript + Vite 前端工程；集成了 AntV X6、Monaco Editor、ECharts 等关键依赖，实现了主题切换、页面布局、Dashboard 与 Intent 页面交互等基础功能。

## 二、D3 拓扑可视化与网络模态编程子系统

完成了基于 D3.js 的拓扑可视化编辑器，替代原有 AntV X6 方案。实现了拖拽式拓扑编辑、前后端拓扑数据同步、网络模态编程子系统（network-modal）。期间修复了笔记本屏幕显示比例异常、拓扑文件刷新丢失等问题。

## 三、PNE DSL 编译器系统开发

建设了完整的编译器管线（compiler/），包含前端语法解析（Lark）、IR 中间表示、语义分析、意图覆盖（intent overlay）等阶段。支持 PNE 协议适配（IP/NDN/GEO）、`#include` 预处理、按节点数据面目标编译，以及编译产物 API 与部署资源检查。同步建设了 Module 模版库与编译总览展示页面。

## 四、LLM Agent 系统集成与智谱模型接入

接入了智谱大模型（GLM）作为后端 LLM 服务，新增了模态开发 Agent 系统与工具调用框架，支持技能化提示（skill-based prompting）。同时在部署阶段引入 SSH 设备属性，实现远程设备连接与维护能力。

## 五、工程规范与开发体验优化

建立了 commitlint、tsconfig 构建产物忽略等开发规范；修复了 Python 3.9 兼容性问题；归档了 legacy editor 目录以简化项目结构；配置了 Cursor Cloud 协作开发环境（AGENTS.md），并持续更新 README 文档。