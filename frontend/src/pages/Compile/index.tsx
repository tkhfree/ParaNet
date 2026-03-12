import {
  App,
  Button,
  Card,
  Col,
  Empty,
  Row,
  Select,
  Space,
  Tabs,
  Typography,
} from 'antd'
import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { CompilePreview, DSLEditor } from '@/components/editor'
import { fileApi, intentApi, topologyApi } from '@/api'
import type { ProjectFileNode } from '@/api/file'
import type { IntentCompileResponse } from '@/model/intent'
import type { Topology } from '@/model/topology'
import { useProjectStore } from '@/stores'

import styles from './index.module.less'

function flattenFiles(nodes: ProjectFileNode[]): ProjectFileNode[] {
  return nodes.flatMap((node) => [node, ...flattenFiles(node.children ?? [])])
}

const Compile: React.FC = () => {
  const { message } = App.useApp()
  const { init, currentProject, currentProjectId, tabs, activeTabId, updateCurrentProject } = useProjectStore()
  const [files, setFiles] = useState<ProjectFileNode[]>([])
  const [topologies, setTopologies] = useState<Topology[]>([])
  const [sourceFileId, setSourceFileId] = useState<string | null>(null)
  const [sourceContent, setSourceContent] = useState('')
  const [compileResult, setCompileResult] = useState<IntentCompileResponse | null>(null)
  const [compiling, setCompiling] = useState(false)
  const [savingIntent, setSavingIntent] = useState(false)

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? null,
    [activeTabId, tabs]
  )

  const loadContext = useCallback(async () => {
    if (!currentProjectId) {
      setFiles([])
      setTopologies([])
      setSourceFileId(null)
      setSourceContent('')
      return
    }
    const [fileRes, topologyRes] = await Promise.all([
      fileApi.getTree(currentProjectId),
      topologyApi.getList({ pageNo: 1, pageSize: 100, projectId: currentProjectId }),
    ])
    const flattenedFiles = flattenFiles(fileRes.data ?? []).filter((file) => !file.isFolder)
    setFiles(flattenedFiles)
    setTopologies(topologyRes.data?.records ?? [])
    const preferredFileId = activeTab?.id ?? currentProject?.currentFileId ?? flattenedFiles[0]?.id ?? null
    setSourceFileId(preferredFileId)
  }, [activeTab?.id, currentProject?.currentFileId, currentProjectId])

  useEffect(() => {
    init()
  }, [init])

  useEffect(() => {
    loadContext()
  }, [loadContext])

  useEffect(() => {
    const loadSource = async () => {
      if (activeTab && activeTab.id === sourceFileId) {
        setSourceContent(activeTab.content)
        return
      }
      if (!sourceFileId) {
        setSourceContent('')
        return
      }
      const res = await fileApi.read(sourceFileId)
      setSourceContent(res.data ?? '')
    }
    loadSource()
  }, [activeTab, sourceFileId])

  const handleCompile = useCallback(async () => {
    if (!currentProjectId) {
      message.warning('请先选择项目')
      return
    }
    if (!sourceContent.trim()) {
      message.warning('请选择包含 DSL 的文件或输入内容')
      return
    }
    setCompiling(true)
    try {
      const res = await intentApi.compilePreview({
        content: sourceContent,
        topologyId: currentProject?.topologyId ?? undefined,
        projectId: currentProjectId,
      })
      setCompileResult(res.data)
      if (res.data.success) {
        message.success('编译完成')
      } else {
        message.error(res.data.errors?.[0] ?? '编译失败')
      }
    } finally {
      setCompiling(false)
    }
  }, [currentProject?.topologyId, currentProjectId, message, sourceContent])

  const handleSaveIntent = useCallback(async () => {
    if (!currentProjectId || !currentProject || !compileResult?.success) {
      return
    }
    setSavingIntent(true)
    try {
      const basePayload = {
        name: `${currentProject.name}-编译产物`,
        description: `由项目 ${currentProject.name} 的编译流程生成`,
        type: 'dsl' as const,
        content: sourceContent,
        topologyId: currentProject.topologyId ?? undefined,
        projectId: currentProjectId,
      }
      let intentId = currentProject.lastIntentId ?? null
      if (intentId) {
        await intentApi.update(intentId, basePayload)
        const compileRes = await intentApi.compile({
          intentId,
          topologyId: currentProject.topologyId ?? '',
        })
        setCompileResult(compileRes.data)
      } else {
        const created = await intentApi.create(basePayload)
        intentId = created.data.id
        const compileRes = await intentApi.compile({
          intentId,
          topologyId: currentProject.topologyId ?? '',
        })
        setCompileResult(compileRes.data)
      }
      if (intentId) {
        await updateCurrentProject({ lastIntentId: intentId })
      }
      message.success('已保存编译产物，部署子系统可直接复用')
    } finally {
      setSavingIntent(false)
    }
  }, [compileResult?.success, currentProject, currentProjectId, message, sourceContent, updateCurrentProject])

  if (!currentProject) {
    return (
      <div className={styles.emptyState}>
        <Empty description="请先进入项目，然后再执行模态编译" />
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <Typography.Title level={2}>模态编译</Typography.Title>
          <Typography.Text type="secondary">
            从当前项目中选择 DSL 源文件，查看 AST、全局 IR、设备级 IR 和编译日志。
          </Typography.Text>
        </div>
        <Space wrap>
          <Select
            style={{ width: 260 }}
            placeholder="选择编译源文件"
            value={sourceFileId ?? undefined}
            options={files.map((file) => ({
              value: file.id,
              label: file.filePath,
            }))}
            onChange={setSourceFileId}
          />
          <Select
            style={{ width: 220 }}
            placeholder="选择项目拓扑"
            value={currentProject.topologyId ?? undefined}
            options={topologies.map((topology) => ({
              value: topology.id,
              label: topology.name,
            }))}
            onChange={async (value) => {
              await updateCurrentProject({ topologyId: value })
            }}
          />
          <Button type="primary" onClick={handleCompile} loading={compiling}>
            开始编译
          </Button>
          <Button onClick={handleSaveIntent} disabled={!compileResult?.success} loading={savingIntent}>
            保存为可部署产物
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={9}>
          <Card title="编译输入">
            <div className={styles.editorWrap}>
              <DSLEditor value={sourceContent} onChange={setSourceContent} height={460} />
            </div>
          </Card>
        </Col>
        <Col xs={24} xl={15}>
          <Card title="编译总览">
            <CompilePreview result={compileResult} loading={compiling} onCompile={handleCompile} />
          </Card>
        </Col>
      </Row>

      <Card title="编译过程产物">
        {compileResult ? (
          <Tabs
            items={[
              {
                key: 'ast',
                label: 'AST',
                children: <pre className={styles.jsonBlock}>{JSON.stringify(compileResult.ast ?? {}, null, 2)}</pre>,
              },
              {
                key: 'globalIr',
                label: '全局 IR',
                children: (
                  <pre className={styles.jsonBlock}>{JSON.stringify(compileResult.globalIr ?? {}, null, 2)}</pre>
                ),
              },
              {
                key: 'deviceIr',
                label: '设备级 IR',
                children: (
                  <Tabs
                    items={(compileResult.deviceIr ?? []).map((item) => ({
                      key: item.deviceId,
                      label: item.deviceId,
                      children: (
                        <pre className={styles.jsonBlock}>{JSON.stringify(item.instructions, null, 2)}</pre>
                      ),
                    }))}
                  />
                ),
              },
              {
                key: 'logs',
                label: '编译日志',
                children: (
                  <pre className={styles.jsonBlock}>{JSON.stringify(compileResult.logs ?? [], null, 2)}</pre>
                ),
              },
            ]}
          />
        ) : (
          <Empty description="执行一次编译后，这里会展示 AST、IR 和日志" />
        )}
      </Card>
    </div>
  )
}

export default Compile
