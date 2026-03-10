export type WorkspaceFileType =
  | 'folder'
  | 'dsl'
  | 'json'
  | 'markdown'
  | 'p4'
  | 'domain'
  | 'text'

export interface WorkspaceProject {
  id: string
  name: string
  remark?: string
  createdAt: string
  updatedAt: string
}

export interface WorkspaceFileNode {
  id: string
  projectId: string
  parentId: string | null
  name: string
  type: WorkspaceFileType
  isFolder: boolean
  content?: string
  createdAt: string
  updatedAt: string
  children?: WorkspaceFileNode[]
}

export interface WorkspaceTab {
  id: string
  fileId: string
  projectId: string
  title: string
  type: Exclude<WorkspaceFileType, 'folder'>
  content: string
  dirty: boolean
  updatedAt: string
}

export interface WorkspaceContextSnapshot {
  projectId?: string
  projectName?: string
  currentFileId?: string
  currentFileName?: string
  currentFileContent?: string
}

export interface WorkspaceBackendTodo {
  capability: string
  legacyEndpoint: string
  proposedEndpoint: string
  status: 'mocked' | 'planned' | 'compatible'
  note: string
}

export const getEditorLanguage = (
  type: WorkspaceFileType,
  fileName?: string,
): 'json' | 'markdown' | 'plaintext' => {
  if (type === 'json') return 'json'
  if (type === 'markdown') return 'markdown'
  if (type === 'dsl' || type === 'p4' || type === 'domain' || type === 'text') {
    return 'plaintext'
  }

  if (fileName?.endsWith('.json')) return 'json'
  if (fileName?.endsWith('.md')) return 'markdown'
  return 'plaintext'
}
