/**
 * Polymorphic DSL 开发页面 — 编辑 DSL + 预览拓扑 + 生成 ONOS App
 */
import Editor from '@monaco-editor/react'
import { Button, Card, Col, Row, Tabs, Tag, Typography, Empty, message, Alert } from 'antd'
import {
  PlayCircleOutlined,
  CodeOutlined,
  ApiOutlined,
  CloudOutlined,
  DatabaseOutlined,
  ThunderboltOutlined,
  CodeSandboxOutlined,
} from '@ant-design/icons'
import React, { useCallback, useState } from 'react'

import { polyApi, type PolyParseResult, type PolyGenerateControlResult, type PolyGenerateP4Result } from '@/api/poly'
import { topologyToD3 } from '@/components/topology/d3-engine'
import type { D3Graph } from '@/components/topology/d3-engine/types'
import D3PreviewerCanvas from '@/components/topology/d3-engine/previewer/D3Canvas'

const { Title, Text, Paragraph } = Typography

/** 根据文件扩展名推断 Monaco 语言 */
function fileLang(path: string): string {
  if (path.endsWith('.java')) return 'java'
  if (path.endsWith('.xml')) return 'xml'
  if (path.endsWith('.json')) return 'json'
  return 'plaintext'
}

/** 默认示例 DSL */
const DEFAULT_DSL = `polymorphic DeterministicFabric extends BaseFabric {
    topology {
        profile spine-profile {
            target: "p4"
            pipeline: "ingress"
            compiler: "p4c"
            mgmt {
                protocol: "grpc"
                port: 50051
                auth: "tls"
            }
        }

        profile leaf-profile {
            target: "p4"
            pipeline: "ingress"
            compiler: "p4c"
            mgmt {
                protocol: "grpc"
                port: 50052
                auth: "tls"
            }
        }

        node spine1 {
            role: "spine"
            profile: "spine-profile"
            mgmt { address: "10.0.0.1" protocol: "grpc" port: 50051 }
        }
        node spine2 {
            role: "spine"
            profile: "spine-profile"
            mgmt { address: "10.0.0.2" protocol: "grpc" port: 50051 }
        }
        node leaf1 {
            role: "leaf"
            profile: "leaf-profile"
            mgmt { address: "10.0.1.1" protocol: "grpc" port: 50052 }
        }
        node leaf2 {
            role: "leaf"
            profile: "leaf-profile"
            mgmt { address: "10.0.1.2" protocol: "grpc" port: 50052 }
        }

        link spine1 -> leaf1 { bandwidth: "100G" latency: "0.1ms" }
        link spine1 -> leaf2 { bandwidth: "100G" latency: "0.1ms" }
        link spine2 -> leaf1 { bandwidth: "100G" latency: "0.1ms" }
        link spine2 -> leaf2 { bandwidth: "100G" latency: "0.1ms" }

        constrain links: "latency < 5ms"
    }

    control {
        app {
            name: "deterministic-controller"
            version: "1.0.0"
            description: "Deterministic fabric controller"
            features: ["topology_discovery", "path_computation"]
        }
        capabilities: ["forwarding", "monitoring"]
        state flow_count: int;

        on link_down(src, dst) {
            detect_failure(src, dst);
            trigger_reroute(src, dst);
        }

        periodic health_check {
            every: "60s"
            check_all_devices();
            report_status();
        }
    }

    data {
        packet ethernet_packet {
            header {
                dst_mac: mac_addr;
                src_mac: mac_addr;
                eth_type: bit16;
            }
        }
        module forward(ethernet_packet) {
            action: l2_forward(pkt);
        }
        service l2_forwarding {
            applies: ["leaf", "spine"]
            target_role: "switch"
            pipeline: "ingress"
        }
    }
}`

const PolyPage: React.FC = () => {
  const [dsl, setDsl] = useState(DEFAULT_DSL)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PolyParseResult | null>(null)
  const [graph, setGraph] = useState<D3Graph>({ nodes: [], links: [] })

  // ONOS 生成相关 state
  const [genLoading, setGenLoading] = useState(false)
  const [genResult, setGenResult] = useState<PolyGenerateControlResult | null>(null)
  const [genTab, setGenTab] = useState<string>('')

  // P4 生成相关 state
  const [p4Loading, setP4Loading] = useState(false)
  const [p4Result, setP4Result] = useState<PolyGenerateP4Result | null>(null)
  const [p4Tab, setP4Tab] = useState<string>('')

  const handleParse = useCallback(async () => {
    setLoading(true)
    try {
      const res = await polyApi.parse(dsl)
      const data = res.data
      setResult(data)

      if (data.success && data.protocols.length > 0) {
        const topo = data.protocols[0].topology
        if (topo) {
          const d3Graph = topologyToD3(topo as any)
          setGraph(d3Graph)
        }
      }
      message.success(data.success ? '解析成功' : '解析失败，请检查 DSL 语法')
    } catch (err: any) {
      message.error(err?.message || '请求失败')
    } finally {
      setLoading(false)
    }
  }, [dsl])

  const handleGenerate = useCallback(async () => {
    setGenLoading(true)
    try {
      const res = await polyApi.generateControl(dsl)
      const data = res.data
      setGenResult(data)
      if (data.success) {
        const fileKeys = Object.keys(data.files)
        if (fileKeys.length > 0) setGenTab(fileKeys[0])
        message.success(`生成成功：${fileKeys.length} 个文件`)
      } else {
        message.warning(data.message || '生成失败，请检查 DSL 中是否包含 control 块')
      }
    } catch (err: any) {
      message.error(err?.message || '请求失败')
    } finally {
      setGenLoading(false)
    }
  }, [dsl])

  const handleGenerateP4 = useCallback(async () => {
    setP4Loading(true)
    try {
      const res = await polyApi.generateP4(dsl)
      const data = res.data
      setP4Result(data)
      if (data.success) {
        const fileKeys = Object.keys(data.files)
        if (fileKeys.length > 0) setP4Tab(fileKeys[0])
        message.success(`生成成功：${fileKeys.length} 个 P4 文件（${data.device_count} 个设备）`)
      } else {
        message.warning(data.message || '生成失败，请检查 DSL 中是否包含 data 和 topology 块')
      }
    } catch (err: any) {
      message.error(err?.message || '请求失败')
    } finally {
      setP4Loading(false)
    }
  }, [dsl])

  const protocol = result?.protocols?.[0]

  // 生成文件 Tabs
  const genFileKeys = genResult ? Object.keys(genResult.files) : []
  const p4FileKeys = p4Result ? Object.keys(p4Result.files) : []

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: 8 }}>
      {/* 工具栏 */}
      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Title level={4} style={{ margin: 0 }}>
          <CodeOutlined /> Polymorphic DSL
        </Title>
        <Tag color="blue">Protocol Design</Tag>
        <div style={{ flex: 1 }} />
        <Button
          type="primary"
          icon={<PlayCircleOutlined />}
          onClick={handleParse}
          loading={loading}
        >
          解析 & 渲染
        </Button>
        <Button
          icon={<ThunderboltOutlined />}
          onClick={handleGenerate}
          loading={genLoading}
        >
          编译 ONOS App
        </Button>
        <Button
          icon={<CodeSandboxOutlined />}
          onClick={handleGenerateP4}
          loading={p4Loading}
        >
          编译 P4
        </Button>
      </div>

      {/* 主区域 */}
      <Row style={{ flex: 1, minHeight: 0 }} gutter={8}>
        {/* 左侧：编辑器 */}
        <Col span={12} style={{ height: '100%' }}>
          <Card
            title="DSL 编辑器"
            size="small"
            style={{ height: '100%' }}
            bodyStyle={{ height: 'calc(100% - 46px)', padding: 0 }}
          >
            <Editor
              height="100%"
              language="plaintext"
              theme="vs-dark"
              value={dsl}
              onChange={(val) => setDsl(val || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: 'on',
                wordWrap: 'on',
                scrollBeyondLastLine: false,
              }}
            />
          </Card>
        </Col>

        {/* 右侧：结果面板 */}
        <Col span={12} style={{ height: '100%' }}>
          <Tabs
            defaultActiveKey="topology"
            style={{ height: '100%' }}
            items={[
              {
                key: 'topology',
                label: (
                  <span><ApiOutlined /> 拓扑预览</span>
                ),
                children: (
                  <div style={{ height: 'calc(100vh - 160px)', border: '1px solid #f0f0f0', borderRadius: 6 }}>
                    {graph.nodes.length > 0 ? (
                      <D3PreviewerCanvas
                        nodes={graph.nodes}
                        links={graph.links}
                      />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <Empty description="点击「解析 & 渲染」预览拓扑" />
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: 'control',
                label: <span><CloudOutlined /> 控制面</span>,
                children: protocol?.control ? (
                  <Card size="small" style={{ height: '100%', overflow: 'auto' }}>
                    <Paragraph>
                      <Text strong>应用名称：</Text>{protocol.control.app.name}
                    </Paragraph>
                    <Paragraph>
                      <Text strong>版本：</Text>{protocol.control.app.version}
                    </Paragraph>
                    <Paragraph>
                      <Text strong>描述：</Text>{protocol.control.app.description}
                    </Paragraph>
                    <Paragraph>
                      <Text strong>能力：</Text>
                      {protocol.control.capabilities.map((c) => (
                        <Tag key={c} color="green">{c}</Tag>
                      ))}
                    </Paragraph>
                    <Paragraph>
                      <Text strong>状态：</Text>
                    </Paragraph>
                    <ul>
                      {protocol.control.states.map((s) => (
                        <li key={s.name}><Text code>{s.name}</Text>: {s.type}</li>
                      ))}
                    </ul>
                    <Paragraph>
                      <Text strong>事件：</Text>
                    </Paragraph>
                    <ul>
                      {protocol.control.events.map((e) => (
                        <li key={e.name}>
                          <Text code>{e.name}</Text>({e.params.join(', ')})
                        </li>
                      ))}
                    </ul>
                  </Card>
                ) : (
                  <Empty description="无控制面数据" />
                ),
              },
              {
                key: 'data',
                label: <span><DatabaseOutlined /> 数据面</span>,
                children: protocol?.data ? (
                  <Card size="small" style={{ height: '100%', overflow: 'auto' }}>
                    <Paragraph>
                      <Text strong>数据包：</Text>
                      {protocol.data.packets.map((p) => (
                        <Tag key={p.name} color="blue">{p.name}</Tag>
                      ))}
                    </Paragraph>
                    <Paragraph>
                      <Text strong>模块：</Text>
                    </Paragraph>
                    <ul>
                      {protocol.data.modules.map((m) => (
                        <li key={m.name}><Text code>{m.name}</Text> (packet: {m.packet})</li>
                      ))}
                    </ul>
                    <Paragraph>
                      <Text strong>服务：</Text>
                    </Paragraph>
                    <ul>
                      {protocol.data.services.map((s) => (
                        <li key={s.name}><Text code>{s.name}</Text> → target: {s.target_role}</li>
                      ))}
                    </ul>
                  </Card>
                ) : (
                  <Empty description="无数据面数据" />
                ),
              },
              {
                key: 'generated',
                label: <span><ThunderboltOutlined /> 生成代码</span>,
                children: (() => {
                  if (!genResult) {
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 200px)' }}>
                        <Empty description="点击「编译 ONOS App」生成 Java 代码" />
                      </div>
                    )
                  }
                  if (!genResult.success) {
                    return (
                      <Alert
                        type="error"
                        showIcon
                        message="生成失败"
                        description={genResult.message || '请检查 DSL 中是否包含有效的 control 块'}
                      />
                    )
                  }
                  return (
                    <div style={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Tag color="green">协议: {genResult.protocol}</Tag>
                        <Tag color="blue">{genFileKeys.length} 个文件</Tag>
                      </div>
                      <Tabs
                        activeKey={genTab}
                        onChange={setGenTab}
                        size="small"
                        style={{ flex: 1, minHeight: 0 }}
                        items={genFileKeys.map((filePath) => ({
                          key: filePath,
                          label: <span style={{ fontSize: 12 }}>{filePath.split('/').pop()}</span>,
                          children: (
                            <div style={{ height: 'calc(100vh - 310px)', border: '1px solid #f0f0f0', borderRadius: 4 }}>
                              <Editor
                                height="100%"
                                language={fileLang(filePath)}
                                theme="vs-dark"
                                value={genResult.files[filePath]}
                                options={{
                                  readOnly: true,
                                  minimap: { enabled: false },
                                  fontSize: 13,
                                  lineNumbers: 'on',
                                  wordWrap: 'on',
                                  scrollBeyondLastLine: false,
                                  domReadOnly: true,
                                }}
                              />
                            </div>
                          ),
                        }))}
                      />
                    </div>
                  )
                })(),
              },
              {
                key: 'p4-generated',
                label: <span><CodeSandboxOutlined /> P4 代码</span>,
                children: (() => {
                  if (!p4Result) {
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 200px)' }}>
                        <Empty description="点击「编译 P4」生成设备 P4 代码" />
                      </div>
                    )
                  }
                  if (!p4Result.success) {
                    return (
                      <Alert
                        type="error"
                        showIcon
                        message="P4 生成失败"
                        description={p4Result.message || '请检查 DSL 中是否包含有效的 data 和 topology 块'}
                      />
                    )
                  }
                  return (
                    <div style={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Tag color="green">协议: {p4Result.protocol}</Tag>
                        <Tag color="blue">{p4FileKeys.length} 个 P4 文件</Tag>
                        {p4Result.device_count && <Tag color="orange">{p4Result.device_count} 个设备</Tag>}
                      </div>
                      <Tabs
                        activeKey={p4Tab}
                        onChange={setP4Tab}
                        size="small"
                        style={{ flex: 1, minHeight: 0 }}
                        items={p4FileKeys.map((filePath) => ({
                          key: filePath,
                          label: <span style={{ fontSize: 12 }}>{filePath.split('/').pop()}</span>,
                          children: (
                            <div style={{ height: 'calc(100vh - 310px)', border: '1px solid #f0f0f0', borderRadius: 4 }}>
                              <Editor
                                height="100%"
                                language={fileLang(filePath)}
                                theme="vs-dark"
                                value={p4Result.files[filePath]}
                                options={{
                                  readOnly: true,
                                  minimap: { enabled: false },
                                  fontSize: 13,
                                  lineNumbers: 'on',
                                  wordWrap: 'on',
                                  scrollBeyondLastLine: false,
                                  domReadOnly: true,
                                }}
                              />
                            </div>
                          ),
                        }))}
                      />
                    </div>
                  )
                })(),
              },
            ]}
          />
        </Col>
      </Row>
    </div>
  )
}

export default PolyPage
