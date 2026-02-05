import type { ProBreadcrumbRoute } from '@/components/ProBreadcrumb'

import { Layout } from 'antd'
import React, { useEffect } from 'react'
import { Outlet } from 'react-router-dom'

import { ProBreadcrumb } from '@/components'
import useRouterStore from '@/stores/router'

import { getIsScreen } from '@/router'
import { useShallow } from 'zustand/shallow'
import classes from './index.module.less'

const PageContent = () => {
  const routes = useRouterStore(useShallow(state => state.userAuths)) as ProBreadcrumbRoute[]

  const isScreen = getIsScreen()
  return (
    <Layout.Content className={classes.pageContent}>
      {/* {!isScreen && <ProBreadcrumb className={classes.pageContentBreadcrumb} routes={routes} />} */}
      <Outlet />
    </Layout.Content>
  )
}

export default PageContent
