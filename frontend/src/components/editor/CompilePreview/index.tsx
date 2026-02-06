import React from 'react'
import { Button, Spin, Alert } from 'antd'
import { ThunderboltOutlined } from '@ant-design/icons'
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

const CompilePreview: React.FC<CompilePreviewProps> = ({
  result,
  loading,
  onCompile,
  disabled = false,
}) => {
  return (
    <div className={styles.compilePreview}>
      <div className={styles.header}>
        <span>编译结果</span>
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
          </div>
        )}
        {!loading && !result && (
          <div className={styles.empty}>
            编辑 DSL 后点击「编译预览」查看生成的配置
          </div>
        )}
        {!loading && result && (
          <>
            {result.success ? (
              <div className={styles.success}>编译成功</div>
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
            {result.warnings && result.warnings.length > 0 && (
              <div className={styles.warnings}>
                <strong>警告：</strong>
                <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                  {result.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
            {result.success && result.config && (
              <>
                <ConfigBlock title="IP 配置" config={result.config.ip} />
                <ConfigBlock title="NDN 配置" config={result.config.ndn} />
                <ConfigBlock title="GEO 配置" config={result.config.geo} />
                <ConfigBlock title="P4 配置" config={result.config.p4} />
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default CompilePreview
