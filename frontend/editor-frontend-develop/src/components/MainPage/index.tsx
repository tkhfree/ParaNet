import { Button } from 'antd'
import React from 'react'
import './index.less'
import { useNavigate } from 'react-router-dom'

export interface PageProps {
  className?: string
  tools?: React.ReactNode
  hasBackBtn?: boolean
  children?: React.ReactNode
}

const MainPage = (props: PageProps) => {
  const navigate = useNavigate()

  const onBack = () => {
    navigate(-1)
  }

  const backBtn = (
    <Button type="primary" ghost onClick={onBack}>
      返回
    </Button>
  )
  const { children, tools, hasBackBtn = true, className = '' } = props ?? {}

  return (
    <div className={`main-page ${className}`}>
      <div className="main-page__content">{children}</div>
      <div className="main-page__tools">
        {tools}
        {hasBackBtn ? backBtn : null}
      </div>
    </div>
  )
}

export default MainPage
