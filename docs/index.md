# ParaNet 文档

欢迎使用 ParaNet - 多模态可编程网络基础设施智能体。

## 概述

ParaNet 是一个 LLM 驱动的多模态网络编程平台，通过自然语言交互实现对多种网络协议的统一编程、编译、部署和控制。

## 主要功能

- **多模态协议支持**: IP、NDN、GEO 等异构网络协议
- **智能交互**: 自然语言描述网络意图
- **统一编译器**: 多目标代码生成
- **自动化部署**: 配置验证、编排、事务管理
- **运行时控制**: 遥测、状态管理、自愈

## 快速开始

### 安装

```bash
# 克隆仓库
git clone https://github.com/YOUR_USERNAME/ParaNet.git
cd ParaNet

# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Linux/Mac
.\venv\Scripts\activate   # Windows

# 安装
pip install -e .
```

### 基本使用

```bash
# 启动 CLI
paranet

# 使用自然语言
paranet> 在节点A和B之间建立一条NDN内容分发通道
```

## 文档结构

- [安装指南](installation.md)
- [用户指南](user-guide.md)
- [DSL 参考](dsl-reference.md)
- [API 参考](api-reference.md)
- [开发指南](development.md)
