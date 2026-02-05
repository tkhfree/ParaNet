# ParaNet 实验室环境

本目录包含用于测试和演示的实验室环境配置。

## 环境类型

### 1. Mininet 拓扑

基于 Mininet 的虚拟网络环境，用于 IP 和 P4 测试。

```bash
# 启动基本拓扑
sudo python lab/mininet/basic_topo.py

# 启动 P4 拓扑
sudo python lab/mininet/p4_topo.py
```

### 2. NDN 测试网络

基于 NFD 的 NDN 测试环境。

```bash
# 使用 Docker Compose 启动
docker-compose -f deployment/docker/docker-compose.yml --profile ndn up
```

### 3. 综合测试环境

包含 IP、NDN、GEO 的混合环境。

```bash
# 启动完整环境
./lab/scripts/start_full_lab.sh
```

## 配置文件

- `mininet/` - Mininet 拓扑脚本
- `ndn/` - NFD 配置文件
- `p4/` - P4 程序和配置
- `scripts/` - 环境管理脚本

## 要求

- Mininet 2.3+
- NFD 0.7+
- BMv2 (可选, 用于 P4)
- Docker & Docker Compose
