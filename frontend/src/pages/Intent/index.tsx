import React, { useCallback } from 'react'
import { Card, Typography, Button, message } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { DSLEditor, ChatInput, CompilePreview } from '@/components/editor'
import { useIntentStore, useTopologyStore } from '@/stores'
import { intentApi } from '@/api/intent'
import type { IntentCompileResponse } from '@/model/intent'
import styles from './index.module.less'

const { Title } = Typography

const Intent: React.FC = () => {
  const {
    dslContent,
    setDslContent,
    compileResult,
    setCompileResult,
    compileLoading,
    setCompileLoading,
    selectedTopologyId,
  } = useIntentStore()

  const { topology } = useTopologyStore()
  const topologyId = (selectedTopologyId ?? topology?.id ?? '') || undefined

  const handleCompilePreview = useCallback(async () => {
    const content = dslContent?.trim()
    if (!content) {
      message.warning('请先输入 DSL 内容')
      return
    }
    setCompileLoading(true)
    setCompileResult(null)
    try {
      const res = await intentApi.compilePreview({
        content,
        topologyId,
      })
      const data = res.data as IntentCompileResponse
      setCompileResult(data)
      if (data.success) {
        message.success('编译成功')
      } else {
        message.error(data.errors?.[0] ?? '编译失败')
      }
    } catch (err) {
      // 开发阶段：后端可能未实现 compile-preview，展示模拟结果
      const mockResult: IntentCompileResponse = {
        success: true,
        config: {
          ip: { routes: ['192.168.1.0/24 -> 10.0.0.0/8 via core-1'] },
          ndn: {},
          geo: {},
          p4: {},
        },
        warnings: ['当前为开发模式模拟结果，请部署后端 /intents/compile-preview 后使用真实编译'],
      }
      setCompileResult(mockResult)
      message.info('已使用模拟编译结果（后端未实现 compile-preview 时）')
    } finally {
      setCompileLoading(false)
    }
  }, [dslContent, topologyId, setCompileLoading, setCompileResult])

  const handleApplyDSL = useCallback(
    (dslCode: string) => {
      setDslContent(dslCode)
      message.success('已应用到编辑器')
    },
    [setDslContent]
  )

  return (
    <div className={styles.intent} style={{ padding: 0 }}>
      <div className={styles.header}>
        <Title level={4} style={{ margin: 0 }}>
          意图编程
        </Title>
        <Button type="primary" icon={<PlusOutlined />}>
          保存意图
        </Button>
      </div>

      <div className={styles.main}>
        <div className={styles.leftPanel}>
          <Card title="DSL 编辑器" className={styles.editorCard}>
            <div className={styles.editorWrap}>
              <DSLEditor
                value={dslContent}
                onChange={setDslContent}
                height="100%"
                width="100%"
              />
            </div>
          </Card>
          <Card title="自然语言描述" className={styles.chatCard}>
            <ChatInput
              onApplyDSL={handleApplyDSL}
              topologyId={topologyId}
            />
          </Card>
        </div>
        <div className={styles.rightPanel}>
          <Card title="编译预览" className={styles.previewCard}>
            <CompilePreview
              result={compileResult}
              loading={compileLoading}
              onCompile={handleCompilePreview}
            />
          </Card>
        </div>
      </div>
    </div>
  )
}

export default Intent
