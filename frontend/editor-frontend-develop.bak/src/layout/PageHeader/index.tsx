import { Layout } from 'antd'
import React from 'react'

import PageHeaderLogo from './PageHeaderLogo'
import PageHeaderMenu from './PageHeaderMenu'
import PageHeaderTools from './PageHeaderTools'

import classes from './index.module.less'

const PageHeader = () => {
  return (
    <>
      <Layout.Header className={classes.header}>
        {/* <PageHeaderLogo /> */}
        <PageHeaderMenu />
        {/* <PageHeaderTools /> */}
      </Layout.Header>
    </>
  )
}

export default PageHeader
