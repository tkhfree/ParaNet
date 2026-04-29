import React, { useMemo, useState } from 'react'
import { Modal, Input, Button, Typography } from 'antd'
import { BookOutlined, ImportOutlined } from '@ant-design/icons'
import styles from './index.module.less'

export interface StdLibModalProps {
  open: boolean
  onClose: () => void
  /** 当前编辑器内容，用于判断是否需要自动插入 `#include` */
  currentContent: string
  /** 插入片段；若需 `#include`，第二个参数为完整 include 行 */
  onInsert: (code: string, includeLine?: string) => void
}

type StdLibEntry = {
  id: string
  title: string
  /** 形如 std/acl.pne，对应 #include <std/acl.pne> */
  includePath: string
  description: string
  snippet: string
}

const STD_LIB_ENTRIES: StdLibEntry[] = [
  {
    id: 'std',
    title: '标准库总入口',
    includePath: 'std/std.pne',
    description: '聚合 parser、二层/三层转发、ACL、QoS、隧道、监控、NAT 等模块，并提供 StdSimpleRouter 等示例应用。',
    snippet:
      '// 使用 std/std.pne 后，可参考同文件中 StdSimpleRouter、StdAclFirewall、StdL2Switch 等 application 定义。',
  },
  {
    id: 'parser',
    title: '解析器（Parser）',
    includePath: 'std/parser.pne',
    description: '以太网 / VLAN / IPv4 / TCP / UDP / VXLAN 等头部解析与组合解析器。',
    snippet:
      '// 在 application 的 parser 块中组合所需头部，例如：parser { hdr.ethernet; hdr.ipv4; }',
  },
  {
    id: 'l2',
    title: '二层转发',
    includePath: 'std/l2_forward.pne',
    description: 'MAC 学习、简单交换与泛洪等二层模块。',
    snippet:
      '// 典型用法：StdSimpleSwitch.apply(...) — 详见 std/l2_forward.pne 与 std/std.pne 中 StdL2Switch。',
  },
  {
    id: 'l3',
    title: '三层转发',
    includePath: 'std/l3_forward.pne',
    description: 'IP 校验、LPM 路由查找、TTL 递减等三层模块。',
    snippet:
      '// 例：StdIpValidation.apply(...); StdLpmLookup.apply(...); StdTtlDecrement.apply(...);',
  },
  {
    id: 'acl',
    title: '访问控制（ACL）',
    includePath: 'std/acl.pne',
    description: '基于五元组等条件的包过滤与策略动作。',
    snippet:
      '// 例：StdBasicAcl.apply(hdr.ipv4.src, hdr.ipv4.dst, hdr.ipv4.protocol, hdr.tcp.src_port, hdr.tcp.dst_port, acl_action, acl_id);',
  },
  {
    id: 'qos',
    title: 'QoS',
    includePath: 'std/qos.pne',
    description: '分类、标记、队列与调度相关模块。',
    snippet: '// 根据业务在 control 中调用 std/qos.pne 内定义的 QoS 模块。',
  },
  {
    id: 'tunnel',
    title: '隧道 / VXLAN',
    includePath: 'std/tunnel.pne',
    description: '封装、解封装与 VTEP 等隧道处理。',
    snippet: '// 可与 std/std.pne 中 StdVtepGateway 示例对照使用。',
  },
  {
    id: 'monitor',
    title: '监控与采样',
    includePath: 'std/monitor.pne',
    description: '流量镜像、sFlow 等监控能力。',
    snippet: '// 在合适位置调用 monitor 模块以挂接采样或镜像逻辑。',
  },
  {
    id: 'nat',
    title: 'NAT',
    includePath: 'std/nat.pne',
    description: '网络地址转换相关模块。',
    snippet: '// 结合路由应用完成源/目的 NAT，详见 std/nat.pne。',
  },
]

function needsIncludeLine(content: string, includePath: string): boolean {
  const angle = `<${includePath}>`
  const quote = `"${includePath}"`
  return !content.includes(angle) && !content.includes(quote)
}

const StdLibModal: React.FC<StdLibModalProps> = ({
  open,
  onClose,
  currentContent,
  onInsert,
}) => {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return STD_LIB_ENTRIES
    return STD_LIB_ENTRIES.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.includePath.toLowerCase().includes(q) ||
        e.id.includes(q),
    )
  }, [query])

  const handleInsert = (entry: StdLibEntry) => {
    const includeLine = needsIncludeLine(currentContent, entry.includePath)
      ? `#include <${entry.includePath}>`
      : undefined
    onInsert(entry.snippet, includeLine)
    onClose()
  }

  return (
    <Modal
      title={
        <span>
          <BookOutlined style={{ marginRight: 8 }} />
          PNE 标准库
        </span>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={760}
      destroyOnClose
      className={styles.stdLibModal}
    >
      <div className={styles.toolbar}>
        <Input.Search
          allowClear
          placeholder="搜索模块名称、路径或说明…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className={styles.list}>
        {filtered.length === 0 ? (
          <div className={styles.empty}>无匹配项，请调整关键词</div>
        ) : (
          filtered.map((entry) => (
            <div key={entry.id} className={styles.item}>
              <div className={styles.itemHeader}>
                <div>
                  <Typography.Title level={5} className={styles.title}>
                    {entry.title}
                  </Typography.Title>
                  <div className={styles.path}>#include &lt;{entry.includePath}&gt;</div>
                </div>
                <Button
                  type="primary"
                  size="small"
                  icon={<ImportOutlined />}
                  onClick={() => handleInsert(entry)}
                >
                  插入
                </Button>
              </div>
              <p className={styles.desc}>{entry.description}</p>
              <pre className={styles.snippet}>{entry.snippet}</pre>
            </div>
          ))
        )}
      </div>
    </Modal>
  )
}

export default StdLibModal
