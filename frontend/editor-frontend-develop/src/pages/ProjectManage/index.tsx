import React, { useEffect, useRef, useState } from 'react'
import styles from './index.module.less'

import { Modal, Splitter, message } from 'antd'
import Top from './Top'
import ProjectTree from './ProjectTree'
import AddFileModal from './AddFileModal'
import useModal from '@/utils/useModal'
import ImportFile from '@/components/ImportFile'
import ImportFileModal from './ImportFileModal'
import MoveFileModal from './MoveFileModal'
import { SideBar } from './SideBar'
import { Terminals } from './Terminals'
import Editor from '@monaco-editor/react'
import { setupP4Language } from './Editor/monacoConfig'
import { P4Language } from './Editor/p4Language'
import Topo from '../../assets/img/project/topo.png'
import Motai from '../../assets/img/project/motai.png'
import P4 from '../../assets/img/project/p4.png'
import Domain from '../../assets/img/project/domain.png'
import Else from '../../assets/img/project/else.png'

import { Empty, Tabs } from 'antd'
import { TopologyPopup } from './Topology'
import { useRequest } from 'ahooks'
import { fetchProjectTree, getFileDetail, updateFileContent } from '@/api/file'
import { fetchProjectList } from '@/api/project'
import sideBarStore from '@/stores/side-bar'
import { useShallow } from 'zustand/shallow'
import topologyStore from '@/stores/topology'
const imageObj: any = {
  '2': Motai,
  '3': Topo,
  '4': Else,
  '5': P4,
  '6': Domain,
}
const ProjectManage = () => {
  // 项目
  const [projectId, setProjectId] = useState()
  const fileModal = useModal<any>('')
  const importFileModal = useModal<any>('导入文件')
  const moveFileModal = useModal<any>('文件移动')
  const [sizes, setSizes] = useState<(number | string)[]>(['70%', '0%'])
  const [popupVisible, setPopupVisible] = useState(false)
  const [popupTopologyId, setPopupTopologyId] = useState('')
  const [popupTopologyTitle, setPopupTopologyTitle] = useState('')
  const [treeVisible, terminalsVisible, setTerminalsVisible] = sideBarStore(
    useShallow(state => [state.treeVisible, state.terminalsVisible, state.setTerminalsVisible]),
  )
  const [setTopology] = topologyStore(useShallow(state => [state.setTopology]))
  const [topology] = topologyStore(useShallow(state => [state.topology]))
  //获取项目列表
  const { data: projectList, refresh: refreshProjectList } = useRequest(() => fetchProjectList())
  //获取文件树
  const [treeData, setTreeData] = useState<any>([])
  const {
    run: getFileTree,
    loading: treeLoading,
    refresh: refreshFileTree,
  } = useRequest(fetchProjectTree, {
    manual: true,
    onSuccess: (res: any) => {
      const item = projectList?.data?.filter((i: any) => i.id == projectId)?.[0]
      const tree = [
        {
          title: item.name,
          key: projectId,
          type: '0',
          disabled: true,
          children: [],
          checkable: false,
        },
      ]
      const obj: any = {
        '0': '3',
        '1': '2',
        '2': '4',
        '4': '5',
        '5': '6',
      }
      if (res.data?.length) {
        const newTree = traverseAndModifyTree(res.data, (node: any) => {
          return {
            ...node,
            key: node.id,
            title: node.fileName,
            disabled: node.isFolder,
            type: node.isFolder ? '1' : obj[node.fileType],
            checkable: node.isFolder ? false : true,
          }
        })
        tree[0].children = newTree
      }

      setTreeData(tree)
    },
  })
  useEffect(() => {
    if (projectId) {
      setItems([])
      setActiveKey(undefined)
      getFileTree(projectId)
    }
  }, [projectId, getFileTree])

  useEffect(() => {
    if (terminalsVisible) {
      setSizes(['70%', '30%'])
    } else {
      setSizes(['70%', '0'])
    }
  }, [terminalsVisible])

  //内容
  const [items, setItems] = useState<any>([])
  const onEdit = (key: any) => {
    const filterList = items.filter((item: any) => item.key !== key)
    const deleteItem = items.find((i: any) => i.key == key)
    console.log(deleteItem)
    if (deleteItem?.isEdit) {
      Modal.confirm({
        onOk: () => {
          if (activeKey == key && items?.length) {
            setActiveKey(filterList[filterList?.length - 1]?.key)
          }
          setItems(filterList)
        },
        title: '该文件还未保存，确定要关闭吗？',
      })
      return
    }
    // 清理编辑器引用
    delete editorsRef.current[key]
    if (activeKey == key && items?.length) {
      setActiveKey(filterList[filterList?.length - 1]?.key)
    }
    setItems(filterList)
  }
  const [activeKey, setActiveKey] = useState<any>()

  const editorsRef = useRef<Record<string, any>>({})
  const handleEditorDidMount = (editor: any, monacoInstance: any, fileId: any) => {
    // 存储当前编辑器实例
    editorsRef.current[fileId] = editor
    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS, () => {
      const activeItem = itemsRef.current?.find((i: any) => i.key == activeKeyRef.current)
      const currentEditor = editorsRef.current[activeKeyRef.current]
      if (activeItem.type == '3') {
        editor
          .getAction('editor.action.formatDocument')
          .run()
          .then(() => {
            console.log(currentEditor.getValue())
            // 保存逻辑
            setItems((prevItems: any) =>
              prevItems.map((item: any) =>
                item.key === activeKeyRef.current
                  ? { ...item, data: currentEditor.getValue(), isEdit: true }
                  : item,
              ),
            )
          })
      }
      setTimeout(() => {
        saveEditContent()
      }, 1000)
    })
    const languages = monacoInstance.languages.getLanguages()
    if (languages?.some((i: any) => i.id == 'p4')) return
    setupP4Language(monacoInstance)
  }
  const handleEditorBeforeMount = (monaco: any) => {
    // 定义基于vs-dark的自定义主题
    monaco.editor.defineTheme('custom-dark', {
      base: 'vs-dark',
      inherit: true,
      colors: {
        'editor.background': '#28292C', // 深蓝色背景
      },
      rules: [], // 保留原有语法高亮规则
    })
  }

  const onPopup = (key: string, id: string, title: string) => {
    const datas = items.filter((item: any) => item.key !== key)
    setItems(datas)
    setPopupVisible(true)
    setPopupTopologyId(id)
    setPopupTopologyTitle(title)
    setActiveKey(datas[datas?.length - 1]?.key)
  }

  //保存编辑器代码
  const itemsRef = useRef<any[]>(items)
  const activeKeyRef = useRef<any>(activeKey)
  useEffect(() => {
    itemsRef.current = items
  }, [items])
  useEffect(() => {
    activeKeyRef.current = activeKey
  }, [activeKey])
  const saveEditContent = async () => {
    const activeItem = itemsRef.current?.find((i: any) => i.key == activeKeyRef.current)
    // console.log('保存了', activeItem)
    const obj = {
      content: activeItem.data,
      fileId: activeItem.key,
    }
    const res = await updateFileContent(obj)
    const newItems = itemsRef.current?.map((i: any) => {
      if (i.key == activeItem.key) {
        return {
          ...i,
          isEdit: false,
        }
      }
      return i
    })
    // console.log(newItems)
    //保存成功后再set
    if (res.code == 0) {
      setItems(newItems)
      setTopology(activeItem.key, 'json')
    }
  }

  useEffect(() => {
    const getData = async (id: string) => {
      const response = await getFileDetail(id)

      setItems((value: any[]) => {
        const item = value.find((item: any) => item.key === id)
        if (item) {
          item.data = response.data
        }
        return [...value]
      })
    }
    if (topology.type === 'topology') {
      getData(topology.id)
    }
  }, [topology])

  const onResize = (sizes: number[]) => {
    setSizes(sizes)

    if (sizes[1] <= 0) {
      setTerminalsVisible(false, 'log')
    }
  }

  return (
    <div className={styles['container']}>
      <div className={styles['top']}>
        <Top
          setProjectId={setProjectId}
          projectId={projectId}
          addProject={() => {
            fileModal.setTitle('新增项目')
            fileModal.setModalData({
              type: '1',
            })
            fileModal.showModal()
          }}
          projectList={projectList}
          onCompile={() => getFileTree(projectId)}
        />
      </div>
      <div className={styles['body']}>
        <Splitter>
          <Splitter.Panel
            defaultSize="46px"
            size="46px"
            min="46px"
            resizable={false}
            style={{ flexShrink: 0 }}
          >
            <SideBar />
          </Splitter.Panel>
          <Splitter.Panel
            defaultSize="270px"
            min="270px"
            size={treeVisible ? '270px' : 0}
            resizable={false}
            style={{ flexShrink: 0 }}
          >
            <ProjectTree
              fileModal={fileModal}
              importFileModal={importFileModal}
              moveFileModal={moveFileModal}
              setItems={setItems}
              tabItems={items}
              setActiveKey={setActiveKey}
              onPopup={onPopup}
              treeData={treeData}
              deleteFunc={(key: string) => {
                if (key == '0') {
                  setTreeData([])
                  setItems([])
                  setActiveKey(undefined)
                  setProjectId(undefined)
                  refreshProjectList()
                }
                refreshFileTree()
              }}
              projectId={projectId}
            />
          </Splitter.Panel>
          <Splitter.Panel>
            <Splitter layout="vertical" onResize={onResize}>
              <Splitter.Panel className={styles['content']} size={sizes[0]}>
                {items?.length ? (
                  <Tabs
                    className={styles['tabs']}
                    type="editable-card"
                    hideAdd
                    size={'small'}
                    activeKey={activeKey}
                    onChange={e => {
                      setActiveKey(e)
                    }}
                    onEdit={onEdit}
                    items={items?.map((i: any) => {
                      if (i.type) {
                        //Monaco编辑器
                        return {
                          key: i.key,
                          label: (
                            <div className={styles['label']}>
                              <img src={imageObj[i.type]} alt="" />
                              <span className={styles['title']}>{i.label}</span>
                              {i.isEdit && <span className={styles['point']}></span>}
                            </div>
                          ),
                          children: (
                            <div style={{ height: '100%' }}>
                              <Editor
                                height="100%"
                                defaultLanguage={
                                  i.type == '3'
                                    ? 'json'
                                    : ['2', '5'].includes(i.type)
                                      ? P4Language.id
                                      : null
                                }
                                language={
                                  i.type == '3'
                                    ? 'json'
                                    : ['2', '5'].includes(i.type)
                                      ? P4Language.id
                                      : null
                                }
                                theme="custom-dark"
                                value={i.data || ''}
                                onChange={(value, event) => {
                                  setItems((prevItems: any) =>
                                    prevItems.map((item: any) =>
                                      item.key === i.key
                                        ? { ...item, data: value, isEdit: true }
                                        : item,
                                    ),
                                  )
                                  // console.log('content changed!', value)
                                }}
                                onMount={(editor, monaco) =>
                                  handleEditorDidMount(editor, monaco, i.key)
                                }
                                beforeMount={handleEditorBeforeMount}
                              />
                            </div>
                          ),
                        }
                      }
                      //拓扑图
                      return {
                        key: i.key,
                        label: i.label,
                        children: i.children,
                        forceRender: true,
                      }
                    })}
                  />
                ) : (
                  <div className={styles['empty']}>
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  </div>
                )}
              </Splitter.Panel>
              <Splitter.Panel size={sizes[1]}>
                <Terminals projectId={projectId} />
              </Splitter.Panel>
            </Splitter>
          </Splitter.Panel>
        </Splitter>
      </div>
      <TopologyPopup
        id={popupTopologyId}
        title={popupTopologyTitle}
        visible={popupVisible}
        setVisible={setPopupVisible}
      />
      <AddFileModal
        {...fileModal.modalProps}
        type={fileModal?.modalData?.type}
        fileId={fileModal?.modalData?.fileId}
        projectId={projectId}
        oldName={fileModal.modalData?.oldName}
        onSubmit={() => {
          message.success('操作成功')
          fileModal.hideModal()
          refreshProjectList()
          if (projectId) {
            refreshFileTree()
          }
        }}
      />
      <ImportFileModal
        {...importFileModal.modalProps}
        projectId={projectId}
        onSubmit={() => {
          importFileModal.hideModal()
          if (projectId) {
            refreshFileTree()
          }
        }}
      />
      <MoveFileModal
        {...moveFileModal.modalProps}
        treeData={treeData}
        fileId={moveFileModal?.modalData?.fileId}
        projectId={projectId}
        onOk={() => {
          moveFileModal.hideModal()
          refreshFileTree()
        }}
      />
    </div>
  )
}

export default ProjectManage

function traverseAndModifyTree(nodes: any, modifier: any) {
  if (!nodes || !nodes.length) return []

  return nodes.map((node: any) => {
    // 创建新节点（浅拷贝 + 递归处理子节点）
    const newNode = {
      ...node, // 浅拷贝当前节点的属性
      children: traverseAndModifyTree(node.children, modifier), // 递归处理子节点
    }

    // 使用 modifier 函数修改新节点（不影响原数据）
    return modifier(newNode)
  })
}
