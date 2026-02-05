import styles from './index.module.less'

import React from 'react'
import sideBarStore from '@/stores/side-bar'
import { useShallow } from 'zustand/shallow'

export const SideBar = () => {
  const [treeVisible, setTreeVisible, setTerminalsVisible] = sideBarStore(
    useShallow(state => [state.treeVisible, state.setTreeVisible, state.setTerminalsVisible]),
  )
  return (
    <div className={styles.container}>
      <div>
        <div className={styles.topology} onClick={() => setTreeVisible(!treeVisible)}></div>
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
