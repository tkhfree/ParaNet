import type {
  WorkspaceBackendTodo,
  WorkspaceFileNode,
  WorkspaceFileType,
  WorkspaceProject,
} from '@/model/workspace'

const STORAGE_KEY = 'paranet-workspace-adapter-v1'

interface WorkspaceStorageData {
  files: WorkspaceFileNode[]
  projects: WorkspaceProject[]
}

interface CreateProjectPayload {
  name: string
  remark?: string
}

interface CreateFilePayload {
  content?: string
  name: string
  parentId?: string | null
  projectId: string
  type: Exclude<WorkspaceFileType, 'folder'> | 'folder'
}

interface RenameFilePayload {
  fileId: string
  name: string
}

const now = () => new Date().toISOString()

const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const buildInitialData = (): WorkspaceStorageData => {
  const createdAt = now()
  const projectId = 'demo-project'
  const rootId = 'root-folder'
  const docsId = 'docs-folder'
  const topologyId = 'demo-topology'
  const readmeId = 'demo-readme'
  const intentId = 'demo-intent'

  return {
    projects: [
      {
        id: projectId,
        name: 'ParaNet Demo Project',
        remark: '前端迁移阶段的本地项目工作台示例',
        createdAt,
        updatedAt: createdAt,
      },
    ],
    files: [
      {
        id: rootId,
        projectId,
        parentId: null,
        name: 'src',
        type: 'folder',
        isFolder: true,
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: docsId,
        projectId,
        parentId: null,
        name: 'docs',
        type: 'folder',
        isFolder: true,
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: intentId,
        projectId,
        parentId: rootId,
        name: 'intent.dsl',
        type: 'dsl',
        isFolder: false,
        content: 'intent route_demo {\n  from "edge-1"\n  to "core-1"\n}\n',
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: topologyId,
        projectId,
        parentId: rootId,
        name: 'topology.json',
        type: 'json',
        isFolder: false,
        content: JSON.stringify(
          {
            nodes: [{ id: 'edge-1', type: 'switch' }, { id: 'core-1', type: 'router' }],
            links: [{ source: 'edge-1', target: 'core-1' }],
          },
          null,
          2,
        ),
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: readmeId,
        projectId,
        parentId: docsId,
        name: 'README.md',
        type: 'markdown',
        isFolder: false,
        content:
          '# Workspace Adapter\n\n当前工作台由前端 API 适配层驱动，后续替换为真实 `workspace/*` 接口。\n',
        createdAt,
        updatedAt: createdAt,
      },
    ],
  }
}

const cloneNode = (node: WorkspaceFileNode): WorkspaceFileNode => ({
  ...node,
  children: node.children?.map(cloneNode),
})

const readStorage = (): WorkspaceStorageData => {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const initial = buildInitialData()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
    return initial
  }

  try {
    const parsed = JSON.parse(raw) as WorkspaceStorageData
    if (!Array.isArray(parsed.projects) || !Array.isArray(parsed.files)) {
      throw new Error('invalid workspace storage')
    }
    return parsed
  } catch {
    const initial = buildInitialData()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
    return initial
  }
}

const writeStorage = (data: WorkspaceStorageData) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

const delay = <T,>(data: T, timeout = 120) =>
  new Promise<T>((resolve) => {
    window.setTimeout(() => resolve(data), timeout)
  })

const buildTree = (projectId: string, files: WorkspaceFileNode[]): WorkspaceFileNode[] => {
  const projectFiles = files
    .filter((item) => item.projectId === projectId)
    .map((item) => ({ ...item, children: [] as WorkspaceFileNode[] }))

  const map = new Map(projectFiles.map((item) => [item.id, item]))
  const roots: WorkspaceFileNode[] = []

  projectFiles.forEach((item) => {
    if (item.parentId && map.has(item.parentId)) {
      map.get(item.parentId)!.children!.push(item)
    } else {
      roots.push(item)
    }
  })

  const sortNodes = (nodes: WorkspaceFileNode[]) => {
    nodes.sort((a, b) => {
      if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    nodes.forEach((node) => {
      if (node.children?.length) sortNodes(node.children)
    })
  }

  sortNodes(roots)
  return roots.map(cloneNode)
}

const touchProject = (projects: WorkspaceProject[], projectId: string) =>
  projects.map((project) =>
    project.id === projectId
      ? {
          ...project,
          updatedAt: now(),
        }
      : project,
  )

export const workspaceBackendRoadmap: WorkspaceBackendTodo[] = [
  {
    capability: '项目列表',
    legacyEndpoint: '/project/projectList',
    proposedEndpoint: 'GET /workspace/projects',
    status: 'mocked',
    note: '当前用本地适配数据模拟，待后端提供统一资源接口',
  },
  {
    capability: '文件树',
    legacyEndpoint: '/file/tree/{projectId}',
    proposedEndpoint: 'GET /workspace/projects/:id/files',
    status: 'mocked',
    note: '当前前端维护树结构，后续切换为后端真实层级数据',
  },
  {
    capability: '文件读取/保存',
    legacyEndpoint: '/file/readFile/{fileId}, /file/updateFileContent',
    proposedEndpoint: 'GET/PUT /workspace/files/:id',
    status: 'mocked',
    note: '当前用于打通多标签编辑器数据流',
  },
  {
    capability: '文件重命名/删除',
    legacyEndpoint: '/file/renameFile, /file/delete',
    proposedEndpoint: 'PATCH/DELETE /workspace/files/:id',
    status: 'mocked',
    note: '当前通过本地适配层实现，后续切换为真实资源接口',
  },
  {
    capability: '工作台终端 WebSocket',
    legacyEndpoint: '/api/terminal',
    proposedEndpoint: 'WS /ws/workspace/terminal',
    status: 'planned',
    note: '前端工作台已预留终端面板，待后端提供可交互会话能力',
  },
]

export const workspaceApi = {
  listProjects: async () => {
    const data = readStorage()
    return delay(data.projects.map((item) => ({ ...item })))
  },

  createProject: async (payload: CreateProjectPayload) => {
    const data = readStorage()
    const createdAt = now()
    const project: WorkspaceProject = {
      id: createId('project'),
      name: payload.name,
      remark: payload.remark,
      createdAt,
      updatedAt: createdAt,
    }
    data.projects.unshift(project)
    writeStorage(data)
    return delay({ ...project })
  },

  listFiles: async (projectId: string) => {
    const data = readStorage()
    return delay(buildTree(projectId, data.files))
  },

  readFile: async (fileId: string) => {
    const data = readStorage()
    const file = data.files.find((item) => item.id === fileId && !item.isFolder)
    if (!file) {
      throw new Error('文件不存在或暂不支持读取文件夹')
    }
    return delay({ ...file })
  },

  saveFile: async (fileId: string, content: string) => {
    const data = readStorage()
    const updatedAt = now()
    data.files = data.files.map((item) =>
      item.id === fileId
        ? {
            ...item,
            content,
            updatedAt,
          }
        : item,
    )
    const target = data.files.find((item) => item.id === fileId)
    if (!target) {
      throw new Error('文件不存在')
    }
    data.projects = touchProject(data.projects, target.projectId)
    writeStorage(data)
    return delay({ ...target, content, updatedAt })
  },

  createFile: async (payload: CreateFilePayload) => {
    const data = readStorage()
    const createdAt = now()
    const file: WorkspaceFileNode = {
      id: createId('file'),
      projectId: payload.projectId,
      parentId: payload.parentId ?? null,
      name: payload.name,
      type: payload.type,
      isFolder: payload.type === 'folder',
      content: payload.type === 'folder' ? undefined : payload.content ?? '',
      createdAt,
      updatedAt: createdAt,
    }
    data.files.push(file)
    data.projects = touchProject(data.projects, payload.projectId)
    writeStorage(data)
    return delay({ ...file })
  },

  renameFile: async ({ fileId, name }: RenameFilePayload) => {
    const data = readStorage()
    const target = data.files.find((item) => item.id === fileId)
    if (!target) {
      throw new Error('文件不存在')
    }

    const siblingDuplicated = data.files.some(
      (item) =>
        item.id !== fileId &&
        item.projectId === target.projectId &&
        item.parentId === target.parentId &&
        item.name === name,
    )
    if (siblingDuplicated) {
      throw new Error('同级目录下已存在同名文件')
    }

    const updatedAt = now()
    data.files = data.files.map((item) =>
      item.id === fileId
        ? {
            ...item,
            name,
            updatedAt,
          }
        : item,
    )
    data.projects = touchProject(data.projects, target.projectId)
    writeStorage(data)
    return delay({
      ...target,
      name,
      updatedAt,
    })
  },

  deleteFile: async (fileId: string) => {
    const data = readStorage()
    const target = data.files.find((item) => item.id === fileId)
    if (!target) {
      throw new Error('文件不存在')
    }

    const idsToDelete = new Set<string>([fileId])
    let changed = true
    while (changed) {
      changed = false
      data.files.forEach((item) => {
        if (item.parentId && idsToDelete.has(item.parentId) && !idsToDelete.has(item.id)) {
          idsToDelete.add(item.id)
          changed = true
        }
      })
    }

    data.files = data.files.filter((item) => !idsToDelete.has(item.id))
    data.projects = touchProject(data.projects, target.projectId)
    writeStorage(data)
    return delay(undefined)
  },
}
