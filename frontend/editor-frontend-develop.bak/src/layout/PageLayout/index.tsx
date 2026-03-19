import { Layout } from 'antd'
import React from 'react'
import { useMatch } from 'react-router-dom'

import { AuthRoute, AutoFirstPath } from '@/components'
import PageContent from '../PageContent'
import PageHeader from '../PageHeader'

import { getIsScreen } from '@/router'
import classes from './index.module.less'

const PageLayout = () => {
  const isScreen = getIsScreen()
  const isProjectManage = useMatch('/project-manage')

  return (
    <AuthRoute>
      <AutoFirstPath>
        <Layout className={classes.content}>
          {!isProjectManage && <PageHeader />}
          <Layout className={classes.layout}>
            <PageContent />
          </Layout>
        </Layout>
      </AutoFirstPath>
    </AuthRoute>
  )
}

export default PageLayout
