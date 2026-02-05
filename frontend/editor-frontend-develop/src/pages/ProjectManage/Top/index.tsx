import styles from './index.module.less'

import { Button, message, Select, Space } from 'antd'
import React, { useEffect, useMemo, useState } from 'react'
import { DynamicIcon } from '@/components'
import { deployAll, deployBackend, deployFrontend, deployProject } from '@/api/remote'
import { DeployDeviceDialog } from './DeployDeviceDialog'
import topologyStore from '@/stores/topology'
import { useShallow } from 'zustand/shallow'

const options1 = [
  { label: '一键', value: '1' },
  { label: '部署', value: '2' },
]

interface IProps {
  setProjectId: any
  projectId: any
  addProject: any
  projectList: any
  onCompile: () => void
}
const Index = (props: IProps) => {
  const { setProjectId, projectId, addProject, projectList, onCompile } = props
  const setFrontendLog = topologyStore(useShallow(state => state.setFrontendLog))
  const setBackendLog = topologyStore(useShallow(state => state.setBackendLog))
  const setDeployLog = topologyStore(useShallow(state => state.setDeployLog))
  const deployDevice = topologyStore(useShallow(state => state.deployDevice))
  const setDeployDevice = topologyStore(useShallow(state => state.setDeployDevice))

  //构建方式
  const [type, setType] = useState('1')
  const [visible, setVisible] = useState(false)
  const options = useMemo(() => {
    return [
      {
        label: <span onClick={() => addProject()}>新建项目</span>,
        value: undefined,
      },
      {
        label: <span>项目列表</span>,
        title: '项目列表',
        options: projectList?.data?.map((i: any) => {
          return {
            label: i.name,
            value: i.id,
          }
        }),
      },
    ]
  }, [projectList, addProject])

  useEffect(() => {
    if (!projectId) return

    const key = `${projectId}-deployDevice`

    const deployDevice = window.localStorage.getItem(key)

    setDeployDevice(projectId, deployDevice || '')
  }, [projectId, setDeployDevice])

  const onClickFront = async () => {
    if (!projectId) {
      message.info('请先选择编译项目')
      return
    }
    const respose = await deployFrontend(projectId)
    setFrontendLog(respose.data)
    message.info('前端编译成功')

    onCompile()
  }

  const onClickBackend = async () => {
    if (!projectId) {
      message.info('请先选择编译项目')
      return
    }

    if (!deployDevice) {
      setVisible(true)
      return
    }
    const respose = await deployBackend(projectId, deployDevice)
    setBackendLog(respose.data)
    message.info('后端编译成功')
    onCompile()
  }

  const onClickDeploy = async (event: React.MouseEvent) => {
    if (!projectId) {
      message.info('请先选择编译项目')
      return
    }

    if (type === '1') {
      const response = await deployAll(projectId)
      setFrontendLog(response.data.frontendCompileLog)
      setBackendLog(response.data.backendCompileLog)
      setDeployLog(response.data.deployLog)

      message.info('一键编译成功')
      onCompile()
      return
    }

    event.stopPropagation()

    setVisible(true)
  }

  const onConfirm = async (values: string) => {
    setDeployDevice(projectId, values)

    if (type === '1') {
      const response = await deployAll(projectId)
      setFrontendLog(response.data.frontendCompileLog)
      setBackendLog(response.data.backendCompileLog)
      setDeployLog(response.data.deployLog)
      message.info('一键编译成功')
      onCompile()
    } else {
      const response = await deployProject(projectId, values)
      setDeployLog(response.data)
      message.info('部署成功')
      onCompile()
    }
  }

  return (
    <div className={styles['top']}>
      <div className={styles['logo']}></div>
      <div className={styles['select']}>
        <Select
          options={options}
          value={projectId}
          placeholder="请选择项目"
          onChange={e => {
            setProjectId(e)
          }}
        />
      </div>
      <div className={styles['title']}>
        <div>集成开发系统</div>
      </div>
      <div className={styles['tool']}>
        <Space>
          <Button
            className={styles.rightButton}
            ghost
            icon={<DynamicIcon name="goujian" />}
            onClick={onClickFront}
          >
            前
          </Button>
          <Button
            className={styles.rightButton}
            ghost
            icon={<DynamicIcon name="goujian" />}
            onClick={onClickBackend}
          >
            后
          </Button>
          <Select
            className={styles.rightSelect}
            prefix={
              <div onClick={onClickDeploy}>
                <DynamicIcon name="goujian" className={styles.rightSelectIcon} />
              </div>
            }
            options={options1}
            value={type}
            onChange={setType}
          />
        </Space>
        {visible && (
          <DeployDeviceDialog
            projectId={projectId}
            visible={visible}
            setVisible={setVisible}
            onConfirm={onConfirm}
          />
        )}
      </div>
    </div>
  )
}

export default Index
