import { Tree, TreeProps } from 'antd'
import React, { Key, useEffect, useState } from 'react'

interface ProTreeProps extends TreeProps {
  onChange?: (keys: Key[]) => void
  value?: Key[]
}

const ProTree = ({ onChange, value, ...treeProps }: ProTreeProps) => {
  const [checkedKeys, setCheckedKeys] = useState<Key[]>([])
  const onCheck = (checkedKeysValue: any, info: any) => {
    setCheckedKeys(checkedKeysValue)
    onChange?.(checkedKeysValue)
    treeProps?.onCheck?.(checkedKeysValue, info)
  }

  useEffect(() => {
    setCheckedKeys(value ?? [])
  }, [value])

  return <Tree {...treeProps} checkable checkedKeys={checkedKeys} onCheck={onCheck} />
}

export default ProTree
