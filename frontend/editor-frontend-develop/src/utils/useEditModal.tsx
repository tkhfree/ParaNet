import useModal from '@/utils/useModal'
import React from 'react'

/**
 * 使用编辑组件
 */
const useEditModal = (EditModal: any, refresh: any) => {
  const editModalConfig = useModal<{
    id?: string
    type: 'add' | 'edit' | 'details'
    [key: string]: any
  }>('新建/编辑')

  // 新增
  const onAdd = async () => {
    editModalConfig.setTitle('新建')
    editModalConfig.setModalData({ type: 'add' })
    editModalConfig.showModal()
  }
  // 编辑
  const onEdit = async (row: any) => {
    editModalConfig.setTitle('编辑')
    editModalConfig.setModalData({ id: row.id, type: 'edit' })
    editModalConfig.showModal()
  }
  // 查看
  const onDetails = async (row: any) => {
    editModalConfig.setTitle('查看')
    editModalConfig.setModalData({ id: row.id, type: 'details' })
    editModalConfig.showModal()
  }
  // 新增/编辑成功回调
  const onEditSuccess = () => {
    editModalConfig.hideModal()
    refresh()
  }

  const modalComponent = (
    <EditModal
      {...editModalConfig.modalProps}
      {...editModalConfig.modalData}
      setConfirmLoading={editModalConfig.setConfirmLoading}
      onOk={onEditSuccess}
    />
  )

  return {
    modalComponent,
    editModalConfig,
    onAdd,
    onEdit,
    onDetails,
    onEditSuccess,
  }
}

export default useEditModal
