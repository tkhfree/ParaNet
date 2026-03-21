import React, { useMemo } from 'react'
import { Button, Spin, Alert, Tag, Collapse, Badge, Table, Typography } from 'antd'
import {
  ThunderboltOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  CodeOutlined,
  ApartmentOutlined,
  CloudServerOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import type { CompiledConfig, CompilerDiagnostic, IntentCompileResponse } from '@/model/intent'
import styles from './index.module.less'

/** 与 compile_pipeline / 界面四阶段对应的 pass 中文说明（不含预处理） */
const PASS_LABELS: Record<string, string> = {
  parse: '词法/语法',
  semantic: '语义与全局 IR',
  lowering: '分片 (Lowering)',
  placement: '放置',
  emit: '管线发射',
}

function passLabel(phase: string | null | undefined): string {
  if (phase == null || phase === '') return '未标注阶段'
  return PASS_LABELS[phase] ?? phase
}

function formatDiagnosticSpan(d: CompilerDiagnostic): string {
  const sp = d.span
  if (!sp) return ''
  return ` (${sp.file}:${sp.line}:${sp.column})`
}

const DIAG_PHASE_ORDER = ['parse', 'semantic', 'lowering', 'placement', 'emit']

function compareDiagnosticsByPhase(a: CompilerDiagnostic, b: CompilerDiagnostic): number {
  const ia = DIAG_PHASE_ORDER.indexOf(a.phase ?? '')
  const ib = DIAG_PHASE_ORDER.indexOf(b.phase ?? '')
  const ra = ia === -1 ? 99 : ia
  const rb = ib === -1 ? 99 : ib
  if (ra !== rb) return ra - rb
  const sev = { error: 0, warning: 1, info: 2 }
  return (sev[a.severity] ?? 3) - (sev[b.severity] ?? 3)
}

/** 后端占位 config 常为四个空对象；空对象在 JS 中为 truthy，不能用来判断「是否有配置」。 */
function hasLegacyCompiledConfig(config: CompiledConfig | undefined): boolean {
  if (!config) return false
  const keys: (keyof CompiledConfig)[] = ['ip', 'ndn', 'geo', 'p4']
  return keys.some((k) => {
    const v = config[k]
    return v != null && typeof v === 'object' && Object.keys(v as object).length > 0
  })
}

type PipelineArtifactsPreview = {
  targetMode?: string
  default_target?: string
  override_target?: string | null
  compiler_version?: string
  nodes?: Array<{
    node_id?: string
    backend?: string
    program_p4?: string
    entries?: Record<string, unknown>
  }>
}

function getPipelinePreview(globalIr: IntentCompileResponse['globalIr']): PipelineArtifactsPreview | undefined {
  if (!globalIr || typeof globalIr !== 'object') return undefined
  const raw = (globalIr as { pipelineArtifactsPreview?: PipelineArtifactsPreview }).pipelineArtifactsPreview
  return raw && typeof raw === 'object' ? raw : undefined
}

export interface CompilePreviewProps {
  result: IntentCompileResponse | null
  loading: boolean
  onCompile: () => void
  disabled?: boolean
  /** 为 false 时不显示右上角编译按钮（例如编译页顶部已有「开始编译」） */
  showCompileButton?: boolean
}

function ConfigBlock({
  title,
  config,
}: {
  title: string
  config: Record<string, unknown> | undefined
}) {
  if (!config || Object.keys(config).length === 0) return null
  return (
    <div className={styles.configBlock}>
      <h4>{title}</h4>
      <pre>{JSON.stringify(config, null, 2)}</pre>
    </div>
  )
}

interface CompileStage {
  key: string
  title: string
  icon: React.ReactNode
  status: 'success' | 'error' | 'wait' | 'process'
  description?: string
  stats?: string
}

const CompilePreview: React.FC<CompilePreviewProps> = ({
  result,
  loading,
  onCompile,
  disabled = false,
  showCompileButton = true,
}) => {
  const stages = useMemo<CompileStage[]>(() => {
    if (!result) return []

    const stages: CompileStage[] = []

    // 阶段1: 词法/语法分析 (AST) — 后端返回 { type: 'Program', value: ProgramNode }
    const astValue = result.ast as { value?: { declarations?: unknown[] } } | undefined
    const astDeclCount = astValue?.value?.declarations?.length ?? 0
    stages.push({
      key: 'ast',
      title: '词法/语法分析',
      icon: <CodeOutlined />,
      status: result.ast ? 'success' : result.success ? 'error' : 'wait',
      description: result.ast ? '生成 Program AST' : '未生成',
      stats: astDeclCount > 0 ? `${astDeclCount} 个顶层声明` : undefined,
    })

    // 阶段2: 语义与管线 (ProgramIR / Fragment / NodePlan)
    const g = result.globalIr as
      | {
          programIr?: unknown
          fragments?: unknown[]
          nodePlans?: unknown[]
        }
      | undefined
    const fragmentCount = Array.isArray(g?.fragments) ? g.fragments.length : 0
    const nodePlanCount = Array.isArray(g?.nodePlans) ? g.nodePlans.length : 0
    stages.push({
      key: 'globalIr',
      title: '语义与全局 IR',
      icon: <ApartmentOutlined />,
      status: result.globalIr ? 'success' : result.success ? 'error' : 'wait',
      description: result.globalIr ? 'ProgramIR + 分片 + 放置计划' : '未生成',
      stats:
        fragmentCount > 0 || nodePlanCount > 0
          ? `${fragmentCount} 个分片，${nodePlanCount} 个节点计划`
          : g?.programIr
            ? '含 ProgramIR'
            : undefined,
    })

    // 阶段3: 设备级 IR (每节点 NodePlan + 管线产物)
    const deviceCount = result.deviceIr?.length ?? 0
    stages.push({
      key: 'deviceIr',
      title: '设备级 IR',
      icon: <CloudServerOutlined />,
      status: result.deviceIr && result.deviceIr.length > 0 ? 'success' : result.success ? 'wait' : 'wait',
      description:
        deviceCount > 0 ? `为 ${deviceCount} 个拓扑节点生成计划` : '未生成设备级 IR',
      stats: deviceCount > 0 ? '每节点含 nodePlan + artifacts' : undefined,
    })

    // 阶段4: 管线产物（真实数据来自 compile_pipeline artifacts，非 ip/ndn/geo/p4 占位桶）
    const preview = getPipelinePreview(result.globalIr)
    const artifactNodes = preview?.nodes ?? []
    stages.push({
      key: 'pipeline',
      title: '管线产物',
      icon: <FileTextOutlined />,
      status: artifactNodes.length > 0 ? 'success' : result.success ? 'wait' : 'wait',
      description:
        artifactNodes.length > 0
          ? `每节点 program.p4 + entries.json（${preview?.override_target ? '全局覆盖后端' : '按节点 dataPlaneTarget'}）`
          : result.success
            ? '未生成管线预览（检查拓扑节点是否与 DSL 对齐）'
            : '未生成',
      stats:
        artifactNodes.length > 0
          ? [
              preview?.targetMode && `mode=${preview.targetMode}`,
              ...artifactNodes.map((n) => `${n.node_id ?? '?'}:${(n.backend ?? '?').toString()}`),
            ]
              .filter(Boolean)
              .join(' · ')
          : undefined,
    })

    return stages
  }, [result])

  const logSummary = useMemo(() => {
    if (!result?.logs) return null
    const info = result.logs.filter((l) => l.level === 'info').length
    const warning = result.logs.filter((l) => l.level === 'warning').length
    const error = result.logs.filter((l) => l.level === 'error').length
    return { info, warning, error, total: result.logs.length }
  }, [result?.logs])

  const diagnostics = result?.diagnostics ?? []
  const diagnosticSummary = useMemo(() => {
    if (!diagnostics.length) return null
    const byPhase = diagnostics.reduce<Record<string, number>>((acc, d) => {
      const p = d.phase || '—'
      acc[p] = (acc[p] ?? 0) + 1
      return acc
    }, {})
    return { byPhase, total: diagnostics.length }
  }, [diagnostics])

  return (
    <div className={styles.compilePreview}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>
          编译结果
          {result && (
            <Tag color={result.success ? 'success' : 'error'} style={{ marginLeft: 8 }}>
              {result.success ? '编译成功' : '编译失败'}
            </Tag>
          )}
        </span>
        {showCompileButton ? (
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            onClick={onCompile}
            loading={loading}
            disabled={disabled}
          >
            编译预览
          </Button>
        ) : null}
      </div>
      <div className={styles.content}>
        {loading && (
          <div className={styles.empty}>
            <Spin tip="正在编译…" />
            <div className={styles.loadingSteps}>
              <p>正在执行编译流程...</p>
              <div className={styles.loadingDots}>
                <span>词法分析</span>
                <span>→</span>
                <span>语义分析</span>
                <span>→</span>
                <span>管线产物</span>
              </div>
            </div>
          </div>
        )}
        {!loading && !result && (
          <div className={styles.empty}>
            编辑 DSL 后点击「编译预览」查看 AST、IR 与管线产物摘要
          </div>
        )}
        {!loading && result && (
          <>
            {/* 编译状态概览 */}
            <div className={styles.statusOverview}>
              {result.success ? (
                <div className={styles.successBanner}>
                  <CheckCircleOutlined className={styles.statusIcon} />
                  <span>编译成功完成</span>
                </div>
              ) : (
                <Alert
                  type="error"
                  message="编译失败"
                  description={(() => {
                    const errDiag = diagnostics.filter((d) => d.severity === 'error')
                    if (errDiag.length > 0) {
                      return (
                        <ul style={{ margin: 0, paddingLeft: 20 }}>
                          {errDiag.map((d, i) => (
                            <li key={i} style={{ marginBottom: 6 }}>
                              <Tag color="purple">{passLabel(d.phase)}</Tag>{' '}
                              <Typography.Text code>{d.code}</Typography.Text> {d.message}
                              {formatDiagnosticSpan(d)}
                            </li>
                          ))}
                        </ul>
                      )
                    }
                    if (result.errors?.length) {
                      return (
                        <ul style={{ margin: 0, paddingLeft: 20 }}>
                          {result.errors.map((e, i) => (
                            <li key={i}>{e}</li>
                          ))}
                        </ul>
                      )
                    }
                    return '未知错误'
                  })()}
                  showIcon
                />
              )}
            </div>

            {/* 编译阶段展示 */}
            {stages.length > 0 && (
              <div className={styles.stagesContainer}>
                <div className={styles.stagesHeader}>
                  <ClockCircleOutlined />
                  <span>编译阶段</span>
                </div>
                <div className={styles.stagesGrid}>
                  {stages.map((stage) => (
                    <div
                      key={stage.key}
                      className={`${styles.stageCard} ${styles[stage.status]}`}
                    >
                      <div className={styles.stageIcon}>{stage.icon}</div>
                      <div className={styles.stageInfo}>
                        <div className={styles.stageTitle}>
                          {stage.title}
                          {stage.status === 'success' && (
                            <CheckCircleOutlined className={styles.checkIcon} />
                          )}
                          {stage.status === 'error' && (
                            <CloseCircleOutlined className={styles.errorIcon} />
                          )}
                        </div>
                        <div className={styles.stageDesc}>{stage.description}</div>
                        {stage.stats && (
                          <div className={styles.stageStats}>
                            <Badge status="processing" />
                            {stage.stats}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 警告信息：有结构化 diagnostics 时在下方「编译器诊断」中展示（含阶段），避免重复 */}
            {diagnostics.length === 0 && result.warnings && result.warnings.length > 0 && (
              <div className={styles.warnings}>
                <div className={styles.warningsHeader}>
                  <ExclamationCircleOutlined />
                  <span>警告 ({result.warnings.length})</span>
                </div>
                <ul>
                  {result.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 编译器诊断：与内部 pass 对应（parse / semantic / …） */}
            {diagnostics.length > 0 && diagnosticSummary && (
              <div className={styles.diagnosticSection}>
                <Collapse
                  ghost
                  defaultActiveKey={
                    !result.success || diagnostics.some((d) => d.severity === 'warning') ? ['diag'] : []
                  }
                  items={[
                    {
                      key: 'diag',
                      label: (
                        <div className={styles.logSummaryHeader}>
                          <ExclamationCircleOutlined />
                          <span>编译器诊断（按阶段）</span>
                          <div className={styles.logCounts}>
                            <Tag>{diagnosticSummary.total} 条</Tag>
                            {Object.entries(diagnosticSummary.byPhase).map(([phase, n]) => (
                              <Tag key={phase} color="default">
                                {passLabel(phase === '—' ? null : phase)} ×{n}
                              </Tag>
                            ))}
                          </div>
                        </div>
                      ),
                      children: (
                        <div className={styles.diagnosticList}>
                          {[...diagnostics].sort(compareDiagnosticsByPhase).map((d, i) => (
                            <div
                              key={`${d.code}-${i}`}
                              className={`${styles.logItem} ${styles[d.severity]}`}
                            >
                              <Tag color="purple" className={styles.diagPhaseTag}>
                                {passLabel(d.phase)}
                              </Tag>
                              <Tag
                                color={
                                  d.severity === 'error'
                                    ? 'red'
                                    : d.severity === 'warning'
                                      ? 'orange'
                                      : 'blue'
                                }
                                className={styles.logLevel}
                              >
                                {d.severity.toUpperCase()}
                              </Tag>
                              <Typography.Text code className={styles.diagCode}>
                                {d.code}
                              </Typography.Text>
                              <span className={styles.logMessage}>
                                {d.message}
                                {formatDiagnosticSpan(d)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ),
                    },
                  ]}
                />
              </div>
            )}

            {/* 编译日志摘要 */}
            {logSummary && logSummary.total > 0 && (
              <div className={styles.logSummary}>
                <Collapse
                  ghost
                  items={[
                    {
                      key: 'logs',
                      label: (
                        <div className={styles.logSummaryHeader}>
                          <FileTextOutlined />
                          <span>编译日志</span>
                          <div className={styles.logCounts}>
                            {logSummary.info > 0 && (
                              <Tag color="blue">{logSummary.info} info</Tag>
                            )}
                            {logSummary.warning > 0 && (
                              <Tag color="orange">{logSummary.warning} warning</Tag>
                            )}
                            {logSummary.error > 0 && (
                              <Tag color="red">{logSummary.error} error</Tag>
                            )}
                          </div>
                        </div>
                      ),
                      children: (
                        <div className={styles.logList}>
                          {result.logs?.map((log, i) => (
                            <div
                              key={i}
                              className={`${styles.logItem} ${styles[log.level]}`}
                            >
                              <span className={styles.logTime}>
                                {new Date(log.timestamp).toLocaleTimeString()}
                              </span>
                              <Tag
                                color={
                                  log.level === 'error'
                                    ? 'red'
                                    : log.level === 'warning'
                                    ? 'orange'
                                    : 'blue'
                                }
                                className={styles.logLevel}
                              >
                                {log.level.toUpperCase()}
                              </Tag>
                              <span className={styles.logMessage}>{log.message}</span>
                            </div>
                          ))}
                        </div>
                      ),
                    },
                  ]}
                />
              </div>
            )}

            {/* 管线产物摘要（真实 P4/entries）；IP/NDN/GEO 等控制面配置仅在非空时展示 */}
            {result.success && (() => {
              const preview = getPipelinePreview(result.globalIr)
              const artifactNodes = preview?.nodes ?? []
              const legacy = hasLegacyCompiledConfig(result.config)
              if (artifactNodes.length === 0 && !legacy) {
                return (
                  <Alert
                    type="info"
                    showIcon
                    className={styles.pipelineHint}
                    message="暂无管线产物表"
                    description="成功编译但无节点级产物时，多为未绑定拓扑或拓扑中无与放置计划对应的节点。请在项目内选择拓扑后重试；完整 JSON 见下方「编译过程产物」选项卡。"
                  />
                )
              }
              return (
                <div className={styles.configSection}>
                  <Collapse
                    ghost
                    defaultActiveKey={artifactNodes.length ? ['pipeline'] : ['legacy']}
                    items={[
                      ...(artifactNodes.length
                        ? [
                            {
                              key: 'pipeline',
                              label: (
                                <div className={styles.configHeader}>
                                  <FileTextOutlined />
                                  <span>管线产物摘要</span>
                                  <Tag color="blue">{artifactNodes.length} 节点</Tag>
                                </div>
                              ),
                              children: (
                                <>
                                  {(preview?.targetMode ||
                                    preview?.default_target != null ||
                                    preview?.override_target != null) && (
                                    <Typography.Paragraph type="secondary" className={styles.manifestMeta}>
                                      targetMode={String(preview?.targetMode ?? '—')}，default=
                                      {String(preview?.default_target ?? '—')}，override=
                                      {preview?.override_target != null ? String(preview.override_target) : '—'}
                                    </Typography.Paragraph>
                                  )}
                                  <Table
                                    size="small"
                                    pagination={false}
                                    rowKey={(r, i) => (r.node_id != null ? String(r.node_id) : `row-${i}`)}
                                    dataSource={artifactNodes}
                                    columns={[
                                      {
                                        title: '节点',
                                        dataIndex: 'node_id',
                                        width: 120,
                                        render: (v: string) => v ?? '—',
                                      },
                                      {
                                        title: '后端',
                                        dataIndex: 'backend',
                                        width: 100,
                                        render: (v: string) => (v ? <Tag>{v}</Tag> : '—'),
                                      },
                                      {
                                        title: 'program.p4',
                                        key: 'p4',
                                        render: (_, row) => {
                                          const t = row.program_p4 ?? ''
                                          const lines = t ? t.split('\n').length : 0
                                          return t
                                            ? `${lines} 行 · ${t.length} 字符`
                                            : '—'
                                        },
                                      },
                                      {
                                        title: 'entries.json',
                                        key: 'ent',
                                        ellipsis: true,
                                        render: (_, row) => {
                                          const e = row.entries ?? {}
                                          const keys = Object.keys(e)
                                          return keys.length ? keys.slice(0, 6).join(', ') + (keys.length > 6 ? '…' : '') : '—'
                                        },
                                      },
                                    ]}
                                  />
                                  <Typography.Paragraph type="secondary" className={styles.pipelineFootnote}>
                                    完整 P4 与 JSON 见页面下方「编译过程产物」中的「全局 IR」与「设备级 IR」。
                                    点击「保存为可部署产物」可写入项目 output/ 目录。
                                  </Typography.Paragraph>
                                </>
                              ),
                            },
                          ]
                        : []),
                      ...(legacy
                        ? [
                            {
                              key: 'legacy',
                              label: (
                                <div className={styles.configHeader}>
                                  <FileTextOutlined />
                                  <span>控制面配置（IP / NDN / GEO / P4）</span>
                                </div>
                              ),
                              children: (
                                <>
                                  <ConfigBlock title="IP 配置" config={result.config?.ip} />
                                  <ConfigBlock title="NDN 配置" config={result.config?.ndn} />
                                  <ConfigBlock title="GEO 配置" config={result.config?.geo} />
                                  <ConfigBlock title="P4 配置" config={result.config?.p4} />
                                </>
                              ),
                            },
                          ]
                        : []),
                    ]}
                  />
                </div>
              )
            })()}
          </>
        )}
      </div>
    </div>
  )
}

export default CompilePreview
