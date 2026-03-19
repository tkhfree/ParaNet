import React from 'react'

import { classNames } from '@/utils/tools'

import classes from './index.module.less'

const PageHeaderLogo = () => {
  return (
    <div className={classNames([classes.logo, classes.logoCollapsed])}>
      {/* <img alt="logo" className={classes.logoImg} src={logo} /> */}
      <span className={classes.logoName}></span>
    </div>
  )
}

export default PageHeaderLogo
