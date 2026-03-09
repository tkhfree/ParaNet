import { ApartmentOutlined, RobotOutlined } from '@ant-design/icons'
import styles from './index.module.less'

import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import sideBarStore from '@/stores/side-bar'
import { useShallow } from 'zustand/shallow'

export const SideBar = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [treeVisible, agentVisible, setTreeVisible, setAgentVisible, setTerminalsVisible] =
    sideBarStore(
      useShallow(state => [
        state.treeVisible,
        state.agentVisible,
        state.setTreeVisible,
        state.setAgentVisible,
        state.setTerminalsVisible,
      ]),
    )
  const agentClassName = `${styles.agent} ${agentVisible ? styles.active : ''}`.trim()
  const controlPlaneClassName = `${styles.controlPlane} ${
    location.pathname === '/control-plane' ? styles.active : ''
  }`.trim()
  const topologyClassName = `${styles.topology} ${treeVisible ? styles.active : ''}`.trim()

  return (
    <div className={styles.container}>
      <div>
        <div className={topologyClassName} onClick={() => setTreeVisible(!treeVisible)}></div>
        <div
          className={controlPlaneClassName}
          onClick={() => navigate('/control-plane')}
          title="控制面操作"
        >
          <ApartmentOutlined />
        </div>
        <div
          className={agentClassName}
          onClick={() => setAgentVisible(!agentVisible)}
          title="智能体对话"
        >
          <RobotOutlined />
        </div>
        <div
          className={styles.terminal}
          onClick={() => setTerminalsVisible(true, 'terminal')}
        ></div>
        <div className={styles.log} onClick={() => setTerminalsVisible(true, 'log')}></div>
      </div>
      <div>
        <div className={styles.avatar}></div>
        <div className={styles.setting}></div>
      </div>
    </div>
  )
}
