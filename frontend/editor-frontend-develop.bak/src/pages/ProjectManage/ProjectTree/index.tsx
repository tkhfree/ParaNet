import { Dropdown, Empty, Modal, Space, Tooltip, Tree, message } from 'antd'
import React, { useState } from 'react'
import styles from './index.module.less'
import { DynamicIcon } from '@/components'
import { TopologyEditor, TopologyPreviewer } from '../Topology'
import Topo from '../../../assets/img/project/topo.png'
import Motai from '../../../assets/img/project/motai.png'
import { useRequest } from 'ahooks'
import { deleteProject } from '@/api/project'
import { deleteFile, downloadFileByFileNo, getFileDetail } from '@/api/file'

//type 0 项目 1文件夹 2模态文件 3json文件   4其他  5 p4  6domain
// const treeData = [
//   {
//     title: '项目',
//     key: '0-0',
//     type: '0',
//     disabled: true,
//     children: [
//       {
//         title: '文件夹',
//         key: '0-0-0',
//         type: '1',
//         disabled: true,
//         children: [
//           {
//             title: '文件.pne',
//             key: '0-0-0-0',
//             type: '2',
//           },
//           {
//             title: '拓扑.json',
//             key: '0-0-0-1',
//             type: '3',
//           },
//         ],
//       },
//       {
//         title: '文件夹',
//         key: '0-0-1',
//         type: '1',
//         disabled: true,
//       },
//     ],
//   },
// ]
interface IProps {
  fileModal: any
  importFileModal: any
  moveFileModal: any
  setItems: any
  tabItems: any
  setActiveKey: any
  treeData: any
  projectId: any
  deleteFunc: (key: string, nodeKey?: string) => void
  onPopup: (key: string, id: string, title: string) => void
}
const Index = (props: IProps) => {
  const {
    fileModal,
    importFileModal,
    moveFileModal,
    setItems,
    tabItems,
    setActiveKey,
    treeData,
    projectId,
    onPopup,
    deleteFunc,
  } = props

  //是否展示复选框
  const [checkableFlag, setCheckableFlag] = useState(false)
  const [checkedKeys, setCheckedKeys] = useState<any>([])
  const menu: any = [
    {
      key: 'rename',
      label: '重命名',
      type: 1,
    },
    {
      key: 'edit',
      label: '编辑',
      type: 2,
    },
    {
      key: 'move',
      label: '移动层级',
      type: 1,
    },
    {
      key: 'delete',
      label: '删除',
    },
    {
      key: 'download',
      label: '下载',
    },
  ]
  const { run: deleteProjectFunc } = useRequest(deleteProject, {
    manual: true,
    onSuccess: () => {
      message.success('操作成功')
      deleteFunc('0')
    },
  })

  // const { run: deleteFileFunc } = useRequest(, {
  //   manual: true,
  //   onSuccess: () => {
  //     message.success('操作成功')
  //     deleteFunc('1')
  //   },
  // })
  const handleMenuClick = (e: any, node: any) => {
    let name = ''
    switch (e.key) {
      case 'rename':
        name = getLastExtension(node.fileName)
        fileModal.setTitle('重命名')
        fileModal.setModalData({ type: '4', fileId: node.key, oldName: name })
        fileModal.showModal()
        break
      case 'edit':
        fileModal.setTitle('编辑项目')
        fileModal.setModalData({ type: '1', fileId: node.key })
        fileModal.showModal()
        break
      case 'move':
        moveFileModal.setModalData({ fileId: node.key })
        moveFileModal.showModal()
        break
      case 'delete':
        Modal.confirm({
          onOk: async () => {
            if (node.type == '0') {
              deleteProjectFunc(node.key)
            } else {
              deleteFile({ fileId: node.key }).then(() => {
                message.success('操作成功')
                deleteFunc('1', node.key)
              })
            }
          },
          title: `确定删除该${node.type == '0' ? '项目' : '文件/文件夹'}吗？`,
        })
        break
      case 'download':
        Modal.confirm({
          onOk: async () => {
            await downloadFileByFileNo({
              projectId,
              fileIds: node.type == '0' ? undefined : [node.key],
            })
          },
          title: `确定下载该${node.type == '0' ? '项目' : '文件/文件夹'}吗？`,
        })
        break
      default:
      // 当 expression 不等于任何 case 时执行的代码
    }
  }
  const titleRender = (node: any) => {
    return (
      <div className={styles['item']}>
        <div className={styles['itemBefore']}>
          <div className={`${styles['icon' + node.type]} ${styles['icon']}`}></div>
          <div className={`${styles['title']} ${styles[node.type == '0' ? 'project' : '']}`}>
            {node.title}
          </div>
        </div>
        <div className={styles['tool']}>
          <Space>
            {node.type == '0' && (
              <>
                {!checkableFlag && (
                  <Tooltip title="导入">
                    <span
                      onClick={event => {
                        event.stopPropagation() // 阻止事件冒泡
                        importFileModal.showModal()
                      }}
                    >
                      <DynamicIcon name={`daoru`} />
                    </span>
                  </Tooltip>
                )}
                <Tooltip title="导出">
                  <span
                    onClick={async event => {
                      event.stopPropagation() // 阻止事件冒泡
                      if (!checkableFlag) {
                        setCheckedKeys([])
                        setCheckableFlag(true)
                        return
                      }
                      await downloadFileByFileNo({
                        projectId,
                        fileIds: checkedKeys,
                      })
                    }}
                  >
                    <DynamicIcon name={`daochu`} />
                  </span>
                </Tooltip>
              </>
            )}
            {['0', '1'].includes(node.type) && !checkableFlag && (
              <>
                <Tooltip title="新增文件夹">
                  <span
                    onClick={event => {
                      event.stopPropagation() // 阻止事件冒泡
                      fileModal.setTitle('新增文件夹')
                      fileModal.setModalData({ type: '2', fileId: node.key })
                      fileModal.showModal()
                    }}
                  >
                    <DynamicIcon name={`wenjianjia`} />
                  </span>
                </Tooltip>
                <Tooltip title="新增文件">
                  <span
                    onClick={event => {
                      event.stopPropagation() // 阻止事件冒泡
                      fileModal.setTitle('新增文件')
                      fileModal.setModalData({ type: '3', fileId: node.key })
                      fileModal.showModal()
                    }}
                  >
                    <DynamicIcon name={`wenjian`} />
                  </span>
                </Tooltip>
              </>
            )}
            {['3'].includes(node.type) && !checkableFlag && (
              <>
                <Tooltip title="编辑拓扑">
                  <span
                    onClick={event => {
                      event.stopPropagation() // 阻止事件冒泡

                      const key = `${node.key}_edit`

                      setActiveKey(key)

                      const keyList = tabItems.map((i: any) => i.key)

                      if (keyList.includes(key)) return

                      setItems((prevItems: any) => [
                        ...prevItems,
                        {
                          key,
                          label: (
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <img src={node.type == '2' ? Motai : Topo} alt="" />
                              <span style={{ marginLeft: '4px' }}>{node.title}</span>
                            </div>
                          ),
                          children: (
                            <TopologyEditor
                              projectId={projectId}
                              id={node.key}
                              title={node.title}
                            />
                          ),
                        },
                      ])
                    }}
                  >
                    <DynamicIcon name={`bianji`} />
                  </span>
                </Tooltip>
                <Tooltip title="查看拓扑">
                  <span
                    onClick={event => {
                      event.stopPropagation() // 阻止事件冒泡

                      const key = `${node.key}_preview`

                      setActiveKey(key)

                      const keyList = tabItems.map((i: any) => i.key)

                      if (keyList.includes(key)) return

                      setItems((prevItems: any) => [
                        ...prevItems,
                        {
                          key,
                          label: (
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <img src={node.type == '2' ? Motai : Topo} alt="" />
                              <span style={{ marginLeft: '4px' }}>{node.title}</span>
                            </div>
                          ),
                          children: (
                            <TopologyPreviewer
                              id={node.key}
                              onPopup={() => onPopup(key, node.key, node.title)}
                            />
                          ),
                        },
                      ])
                    }}
                  >
                    <DynamicIcon name={`view`} />
                  </span>
                </Tooltip>
              </>
            )}
            {
              // ['1', '2', '3'].includes(node.type) &&
              !checkableFlag && (
                <>
                  <Dropdown
                    menu={{
                      items: menu.filter((i: any) =>
                        node.type == '0' ? i.type !== 1 : i.type !== 2,
                      ),
                      onClick: e => {
                        e.domEvent.stopPropagation()
                        handleMenuClick(e, node)
                      },
                    }}
                    trigger={['click']}
                    placement={'bottomRight'}
                    getPopupContainer={() => document.body}
                  >
                    <Tooltip title="">
                      <span
                        onClick={event => {
                          event.stopPropagation() // 阻止事件冒泡
                        }}
                      >
                        <DynamicIcon name={`qita`} />
                      </span>
                    </Tooltip>
                  </Dropdown>
                </>
              )
            }
            {checkableFlag && (
              <>
                <Tooltip title="关闭">
                  <span
                    onClick={event => {
                      event.stopPropagation() // 阻止事件冒泡
                      setCheckableFlag(false)
                    }}
                  >
                    <DynamicIcon name={`close`} />
                  </span>
                </Tooltip>
              </>
            )}
          </Space>
        </div>
      </div>
    )
  }
  const onSelect = async (key: any, row: any) => {
    setActiveKey(row.node.key)
    const keyList = tabItems.map((i: any) => i.key)
    if (keyList.includes(row.node.key)) return
    const label = row.node.title?.length > 10 ? row.node.title.slice(0, 10) + '...' : row.node.title
    const res = await getFileDetail(row.node.key)
    setItems((prevItems: any) => [
      ...prevItems,
      //如果是编辑器要展示代码，需要给内容存到data里，以便于数据管理
      {
        key: row.node.key,
        label: label,
        type: row.node.type,
        data: res.data,
      },
    ])
  }
  return (
    <div className={styles['projectTree']}>
      {treeData?.length ? (
        <Tree
          checkable={checkableFlag}
          autoExpandParent={true}
          defaultExpandAll
          // fieldNames={{
          //   children: 'subIndicatorList',
          //   key: 'indicatorId',
          //   title: 'indicatorName',
          // }}
          // onExpand={onExpand}
          onSelect={onSelect}
          // selectedKeys={selectedKeys}
          showIcon={false}
          titleRender={titleRender}
          treeData={treeData}
          checkedKeys={checkedKeys}
          onCheck={e => {
            setCheckedKeys(e)
          }}
          expandAction="click"
        />
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="请选择项目" />
      )}
    </div>
  )
}

export default Index

function getLastExtension(str: string) {
  console.log(str)
  const lastDotIndex = str.lastIndexOf('.')
  if (lastDotIndex === -1) return str // 如果没有点，返回空字符串

  return str.slice(0, lastDotIndex)
}
