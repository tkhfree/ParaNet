import React, { useMemo } from 'react'
import { Button, Spin, Alert, Tag, Collapse, Badge } from 'antd'
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
import type { IntentCompileResponse } from '@/model/intent'
import styles from './index.module.less'

export interface CompilePreviewProps {
  result: IntentCompileResponse | null
  loading: boolean
  onCompile: () => void
  disabled?: boolean
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
}) => {
  const stages = useMemo<CompileStage[]>(() => {
    if (!result) return []

    const stages: CompileStage[] = []

    // 阶段1: 词法/语法分析 (AST)
    const astNodeCount = result.ast?.children?.length ?? 0
    stages.push({
      key: 'ast',
      title: '词法/语法分析',
      icon: <CodeOutlined />,
      status: result.ast ? 'success' : result.success ? 'error' : 'wait',
      description: result.ast ? '生成抽象语法树' : '未生成',
      stats: astNodeCount > 0 ? `${astNodeCount} 个语法节点` : undefined,
    })

    // 阶段2: 语义分析 (Global IR)
    const globalIrInstructions = result.globalIr?.instructions?.length ?? 0
    const globalIrSummary = result.globalIr?.summary
    stages.push({
      key: 'globalIr',
      title: '语义分析',
      icon: <ApartmentOutlined />,
      status: result.globalIr ? 'success' : result.success ? 'error' : 'wait',
      description: result.globalIr ? '生成全局中间表示' : '未生成',
      stats:
        globalIrInstructions > 0
          ? `${globalIrInstructions} 条全局指令`
          : globalIrSummary
          ? '已生成摘要'
          : undefined,
    })

    // 阶段3: 设备配置生成 (Device IR)
    const deviceCount = result.deviceIr?.length ?? 0
    const totalDeviceInstructions =
      result.deviceIr?.reduce((sum, d) => sum + (d.instructions?.length ?? 0), 0) ?? 0
    stages.push({
      key: 'deviceIr',
      title: '设备配置生成',
      icon: <CloudServerOutlined />,
      status: result.deviceIr && result.deviceIr.length > 0 ? 'success' : result.success ? 'wait' : 'wait',
      description:
        deviceCount > 0 ? `为 ${deviceCount} 个设备生成配置` : '未生成设备配置',
      stats: totalDeviceInstructions > 0 ? `${totalDeviceInstructions} 条设备指令` : undefined,
    })

    // 阶段4: 配置输出
    const configTypes = result.config
      ? Object.keys(result.config).filter((k) => result.config?.[k as keyof typeof result.config])
      : []
    stages.push({
      key: 'config',
      title: '配置输出',
      icon: <FileTextOutlined />,
      status: configTypes.length > 0 ? 'success' : result.success ? 'wait' : 'wait',
      description: configTypes.length > 0 ? `生成 ${configTypes.length} 种配置` : '无配置输出',
      stats: configTypes.length > 0 ? configTypes.join(', ').toUpperCase() : undefined,
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
        <Button
          type="primary"
          icon={<ThunderboltOutlined />}
          onClick={onCompile}
          loading={loading}
          disabled={disabled}
        >
          编译预览
        </Button>
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
                <span>配置生成</span>
              </div>
            </div>
          </div>
        )}
        {!loading && !result && (
          <div className={styles.empty}>
            编辑 DSL 后点击「编译预览」查看生成的配置
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
                  description={
                    result.errors?.length ? (
                      <ul style={{ margin: 0, paddingLeft: 20 }}>
                        {result.errors.map((e, i) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ul>
                    ) : (
                      '未知错误'
                    )
                  }
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

            {/* 警告信息 */}
            {result.warnings && result.warnings.length > 0 && (
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

            {/* 配置详情 */}
            {result.success && result.config && (
              <div className={styles.configSection}>
                <Collapse
                  ghost
                  items={[
                    {
                      key: 'config',
                      label: (
                        <div className={styles.configHeader}>
                          <FileTextOutlined />
                          <span>配置详情</span>
                        </div>
                      ),
                      children: (
                        <>
                          <ConfigBlock title="IP 配置" config={result.config.ip} />
                          <ConfigBlock title="NDN 配置" config={result.config.ndn} />
                          <ConfigBlock title="GEO 配置" config={result.config.geo} />
                          <ConfigBlock title="P4 配置" config={result.config.p4} />
                        </>
                      ),
                    },
                  ]}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default CompilePreview
