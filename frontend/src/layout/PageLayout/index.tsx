import { Layout } from 'antd'
import React from 'react'
import { Outlet } from 'react-router-dom'

import PageHeader from '../PageHeader'
import PageSider from '../PageSider'

import styles from './index.module.less'

const { Content } = Layout

const PageLayout: React.FC = () => {

  return (
    <Layout className={styles.layout}>
      <PageHeader />
      <Layout>
        <PageSider />
        <Layout className={styles.mainLayout}>
          <Content className={styles.content}>
            <Outlet />
          </Content>
        </Layout>
      </Layout>
    </Layout>
  )
}

export default PageLayout
