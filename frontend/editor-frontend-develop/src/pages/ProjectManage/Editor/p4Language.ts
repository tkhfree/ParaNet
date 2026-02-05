export const P4Language: any = {
  id: 'p4',

  configuration: {
    comments: {
      lineComment: '//',
      blockComment: ['/*', '*/'],
    },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')'],
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    folding: {
      markers: {
        start: new RegExp('^\\s*#pragma\\s+region\\b'),
        end: new RegExp('^\\s*#pragma\\s+endregion\\b'),
      },
    },
  },

  definition: {
    defaultToken: '',
    tokenPostfix: '.p4',

    keywords: [
      'action',
      'actions',
      'apply',
      'bool',
      'bit',
      'const',
      'control',
      'default',
      'else',
      'enum',
      'error',
      'extern',
      'exit',
      'false',
      'header',
      'header_union',
      'if',
      'in',
      'inout',
      'int',
      'key',
      'match_kind',
      'out',
      'parser',
      'package',
      'return',
      'select',
      'state',
      'struct',
      'switch',
      'table',
      'this',
      'transition',
      'true',
      'tuple',
      'typedef',
      'varbit',
      'verify',
      'void',
      'module',
      'control',
      'parser',
      'application',
      'service',
      'if',
      'else',
      'switch',
      'assert',
      'using',
      'tuple',
      'set',
      'map',
      'static',
      'func',
      'sendToCPU',
      'nop',
      'drop',
      'removeHeader',
      'addHeader',
      'return',
      'updateChecksum',
      'HeaderCompress',
    ],

    typeKeywords: ['bit', 'int', 'varbit', 'bool', 'error', 'match_kind'],

    operators: [
      '=',
      '>',
      '<',
      '!',
      '~',
      '?',
      ':',
      '==',
      '<=',
      '>=',
      '!=',
      '&&',
      '||',
      '++',
      '--',
      '+',
      '-',
      '*',
      '/',
      '&',
      '|',
      '^',
      '%',
      '<<',
      '>>',
      '>>>',
      '+=',
      '-=',
      '*=',
      '/=',
      '&=',
      '|=',
      '^=',
      '%=',
      '<<=',
      '>>=',
      '>>>=',
    ],

    symbols: /[=><!~?:&|+\-*/^%]+/,
    digits: /\d+(_+\d+)*/,
    escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

    tokenizer: {
      root: [
        [
          /[a-zA-Z_]\w*/,
          {
            cases: {
              '@keywords': 'keyword',
              '@typeKeywords': 'type',
              '@default': 'identifier',
            },
          },
        ],
        { include: '@whitespace' },
        [/[{}()[\]}]/, '@brackets'],
        [/[<>](?!@symbols)/, '@brackets'],
        [
          /@symbols/,
          {
            cases: {
              '@operators': 'operator',
              '@default': '',
            },
          },
        ],
        [/\d*\.\d+([eE][-+]?\d+)?/, 'number.float'],
        [/0[xX][0-9a-fA-F]+/, 'number.hex'],
        [/\d+/, 'number'],
        [/[;,.]/, 'delimiter'],
        [/"([^"\\]|\\.)*$/, 'string.invalid'],
        [/'([^'\\]|\\.)*$/, 'string.invalid'],
        [/"/, 'string', '@string_double'],
        [/'/, 'string', '@string_single'],
      ],

      whitespace: [
        [/[ \t\r\n]+/, 'white'],
        [/\/\*/, 'comment', '@comment'],
        [/\/\/.*$/, 'comment'],
      ],

      comment: [
        [/[^/*]+/, 'comment'],
        [/\/\*/, 'comment', '@push'],
        ['\\*/', 'comment', '@pop'],
        [/[/*]/, 'comment'],
      ],

      string_double: [
        [/[^\\"]+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/"/, 'string', '@pop'],
      ],

      string_single: [
        [/[^\\']+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/'/, 'string', '@pop'],
      ],
    },
  },

  completionItems: [
    // 关键字补全
    { label: 'action', kind: 'keyword', documentation: 'Define an action' },
    { label: 'control', kind: 'keyword', documentation: 'Control block' },
    { label: 'parser', kind: 'keyword', documentation: 'Parser block' },
    { label: 'table', kind: 'keyword', documentation: 'Define a table' },
    { label: 'header', kind: 'keyword', documentation: 'Define a header' },
    { label: 'struct', kind: 'keyword', documentation: 'Define a struct' },
    { label: 'module', kind: 'keyword', documentation: '定义一个模块' },
    { label: 'application', kind: 'keyword', documentation: '定义一个应用' },
    // 控制结构
    { label: 'service', kind: 'keyword', documentation: '定义一个服务' },
    { label: 'if', kind: 'keyword', documentation: '条件语句' },
    { label: 'else', kind: 'keyword', documentation: 'else语句' },
    { label: 'switch', kind: 'keyword', documentation: 'switch语句' },
    // 数据类型
    { label: 'bit', kind: 'type', documentation: '位类型' },
    { label: 'int', kind: 'type', documentation: '整数类型' },
    { label: 'tuple', kind: 'type', documentation: '元组类型' },
    { label: 'set', kind: 'type', documentation: '集合类型' },
    { label: 'map', kind: 'type', documentation: '映射类型' },
    // 原生操作
    { label: 'drop', kind: 'function', documentation: '丢弃数据包' },
    { label: 'sendToCPU', kind: 'function', documentation: '发送到CPU处理' },
    { label: 'nop', kind: 'function', documentation: '空操作' },
    {
      label: 'parser',
      kind: 'snippet',
      insertText: ['parser ${1:MyParser}(${2:packet_in packet}) {', '    ${3}', '}'].join('\n'),
      documentation: 'Parser block',
    },
    {
      label: 'control',
      kind: 'snippet',
      insertText: ['control ${1:MyControl}() {', '    ${2}', '}'].join('\n'),
      documentation: 'Control block',
    },
    {
      label: 'isValid()',
      kind: 'method',
      documentation: '检查头部或字段是否有效',
      insertText: 'isValid()',
      detail: '方法',
    },

    // apply() 相关补全
    {
      label: 'apply()',
      kind: 'method',
      documentation: '应用解析器或控制逻辑',
      insertText: 'apply()',
      detail: '方法',
    },
  ],

  // validationRules: [
  //   {
  //     // 规则1：检查分号结尾
  //     regex: /[^\s;{}][^{}]$/gm,
  //     message: '语句应以分号结尾',
  //     severity: 'error',
  //     exclude: [/^\s*\/\//, /^\s*\/\*/, /\*\/\s*$/], // 排除注释
  //   },

  // ],
  validationRules: [
    // {
    //   validator: (code: string) => {
    //     const errors: Array<{
    //       message: string
    //       severity: 'error' | 'warning' | 'info'
    //       position: { line: number; column: number }
    //     }> = []

    //     const lines = code.split('\n')
    //     const controlFlowKeywords = new Set(['if', 'else', 'module', 'control', 'apply', 'using'])
    //     const noSemiFunctions = new Set(['drop'])
    //     const preprocessorKeywords = new Set(['#include'])

    //     let braceLevel = 0
    //     let inCommentBlock = false
    //     let isAfterOpeningBrace = false

    //     lines.forEach((line, lineIndex) => {
    //       const lineNum = lineIndex + 1

    //       // 分离代码和行尾注释
    //       const codePart = line.split('//')[0].trim() // 获取//之前的部分
    //       const trimmed = codePart.trim() // 实际要检查的代码部分

    //       // 重置开括号状态（每行开始时重置）
    //       isAfterOpeningBrace = false

    //       // 处理多行注释状态
    //       if (inCommentBlock) {
    //         if (line.includes('*/')) {
    //           inCommentBlock = false
    //           const remainingCode = line.split('*/')[1].trim()
    //           if (!remainingCode) return
    //         } else {
    //           return
    //         }
    //       }

    //       // 检查是否以开括号结束
    //       if (codePart.endsWith('{')) {
    //         isAfterOpeningBrace = true
    //       }

    //       // 跳过空行、单行注释、多行注释开始
    //       if (!trimmed || line.trim().startsWith('//') || line.trim().startsWith('/*')) {
    //         if (line.trim().startsWith('/*') && !line.includes('*/')) {
    //           inCommentBlock = true
    //         }
    //         return
    //       }

    //       // 跳过预处理指令
    //       if (preprocessorKeywords.has(trimmed.split(' ')[0])) {
    //         return
    //       }

    //       // 更新大括号层级（基于完整行计算）
    //       const openBraces = (line.match(/{/g) || []).length
    //       const closeBraces = (line.match(/}/g) || []).length
    //       braceLevel += openBraces - closeBraces

    //       // 跳过模块、控制块和应用定义行
    //       if (
    //         trimmed.startsWith('module ') ||
    //         trimmed.startsWith('control ') ||
    //         trimmed.startsWith('application ') ||
    //         trimmed.match(/^[a-zA-Z_]\w*\s*\([^)]*\)\s*{/) ||
    //         trimmed.match(/^\w+\s+using\s+\w+/)
    //       ) {
    //         return
    //       }

    //       // 跳过控制流关键字开始的行
    //       const firstToken = trimmed.split(/\s+/)[0]
    //       if (controlFlowKeywords.has(firstToken)) {
    //         return
    //       }

    //       // 跳过单独的大括号行
    //       if (trimmed === '{' || trimmed === '}') {
    //         return
    //       }

    //       // 检查是否需要分号（排除开括号后的行）
    //       if (!codePart.endsWith(';') && braceLevel > 0 && !isAfterOpeningBrace) {
    //         // 排除函数调用不需要分号的情况
    //         const isNoSemiCall = Array.from(noSemiFunctions).some(
    //           fn =>
    //             trimmed.startsWith(`${fn}(`) && (trimmed.endsWith(')') || codePart.endsWith(')')),
    //         )

    //         // 排除闭括号后跟其他内容的情况
    //         const isBraceWithMore = /}\s*else\s*{/.test(trimmed) || /}\s*[a-zA-Z]/.test(trimmed)

    //         if (!isNoSemiCall && !isBraceWithMore) {
    //           // 找到最后一个非空白代码字符的位置
    //           let lastCharPos = codePart.length
    //           while (lastCharPos > 0 && codePart[lastCharPos - 1].match(/\s/)) {
    //             lastCharPos--
    //           }

    //           // 如果整行都是注释后的空白，则使用行尾位置
    //           const displayPos = lastCharPos > 0 ? lastCharPos : line.length

    //           errors.push({
    //             message: '语句应以分号结尾',
    //             severity: 'error',
    //             position: {
    //               line: lineNum,
    //               column: displayPos,
    //             },
    //           })
    //         }
    //       }
    //     })

    //     return errors
    //   },
    // },
    {
      validator: (code: string) => {
        const errors: Array<{
          message: string
          severity: 'error' | 'warning' | 'info'
          position: { line: number; column: number }
        }> = []

        const lines = code.split('\n')
        const controlFlowKeywords = new Set([
          'if',
          'else',
          'module',
          'control',
          'parser',
          'application',
          'using',
        ])
        const noSemiFunctions = new Set(['drop'])
        const preprocessorKeywords = new Set(['#include'])

        // 新增：parser块内允许的语句模式（带或不带分号）
        const parserStatementPattern = /^[a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*;?$/

        let braceLevel = 0
        let inCommentBlock = false
        let isAfterOpeningBrace = false
        let inParserBlock = false

        lines.forEach((line, lineIndex) => {
          const lineNum = lineIndex + 1

          // 分离代码和行尾注释
          const codePart = line.split('//')[0].trim()
          const trimmed = codePart.trim()

          // 重置开括号状态
          isAfterOpeningBrace = false

          // 检查是否进入parser块
          if (trimmed === 'parser {') {
            inParserBlock = true
            return
          }
          // 检查是否离开parser块
          else if (inParserBlock && trimmed === '}') {
            inParserBlock = false
            return
          }

          // 处理多行注释状态
          if (inCommentBlock) {
            if (line.includes('*/')) {
              inCommentBlock = false
              const remainingCode = line.split('*/')[1].trim()
              if (!remainingCode) return
            } else {
              return
            }
          }

          // 检查是否以开括号结束
          if (codePart.endsWith('{')) {
            isAfterOpeningBrace = true
          }

          // 跳过空行、单行注释、多行注释开始
          if (!trimmed || line.trim().startsWith('//') || line.trim().startsWith('/*')) {
            if (line.trim().startsWith('/*') && !line.includes('*/')) {
              inCommentBlock = true
            }
            return
          }

          // 跳过预处理指令
          if (preprocessorKeywords.has(trimmed.split(' ')[0])) {
            return
          }

          // 更新大括号层级
          const openBraces = (line.match(/{/g) || []).length
          const closeBraces = (line.match(/}/g) || []).length
          braceLevel += openBraces - closeBraces

          // 跳过模块、控制块和应用定义行
          if (
            trimmed.startsWith('module ') ||
            trimmed.startsWith('control ') ||
            trimmed.startsWith('application ') ||
            trimmed.match(/^[a-zA-Z_]\w*\s*\([^)]*\)\s*{/) ||
            trimmed.match(/^\w+\s+using\s+\w+/)
          ) {
            return
          }

          // 跳过控制流关键字开始的行
          const firstToken = trimmed.split(/\s+/)[0]
          if (controlFlowKeywords.has(firstToken)) {
            return
          }

          // 跳过单独的大括号行
          if (trimmed === '{' || trimmed === '}') {
            return
          }

          // 在parser块内完全跳过分号检查
          if (inParserBlock) {
            return
          }

          // 检查是否需要分号（排除开括号后的行）
          if (!codePart.endsWith(';') && braceLevel > 0 && !isAfterOpeningBrace) {
            // 排除函数调用不需要分号的情况
            const isNoSemiCall = Array.from(noSemiFunctions).some(
              fn =>
                trimmed.startsWith(`${fn}(`) && (trimmed.endsWith(')') || codePart.endsWith(')')),
            )

            // 排除闭括号后跟其他内容的情况
            const isBraceWithMore = /}\s*else\s*{/.test(trimmed) || /}\s*[a-zA-Z]/.test(trimmed)

            if (!isNoSemiCall && !isBraceWithMore) {
              // 找到最后一个非空白代码字符的位置
              let lastCharPos = codePart.length
              while (lastCharPos > 0 && codePart[lastCharPos - 1].match(/\s/)) {
                lastCharPos--
              }

              // 如果整行都是注释后的空白，则使用行尾位置
              const displayPos = lastCharPos > 0 ? lastCharPos : line.length

              errors.push({
                message: '语句应以分号结尾',
                severity: 'error',
                position: {
                  line: lineNum,
                  column: displayPos,
                },
              })
            }
          }
        })

        return errors
      },
    },

    // 可以添加其他校验规则...
    {
      // 检查大括号匹配
      validator: (code: string) => {
        console.log('校验了')
        const errors: any = []
        const stack: Array<{ char: string; line: number; column: number }> = []
        const lines = code.split('\n')

        lines.forEach((line, lineIndex) => {
          const lineNum = lineIndex + 1
          for (let col = 0; col < line.length; col++) {
            const char = line[col]
            if (['{', '(', '['].includes(char)) {
              stack.push({ char, line: lineNum, column: col + 1 })
            } else if (['}', ')', ']'].includes(char)) {
              const expected = { '}': '{', ')': '(', ']': '[' }[char]
              const last = stack.pop()

              if (!last || last.char !== expected) {
                errors.push({
                  message: `不匹配的括号 '${char}'`,
                  severity: 'error',
                  position: { line: lineNum, column: col + 1 },
                })
              }
            }
          }
        })

        // 检查未闭合的括号
        stack.forEach(({ char, line, column }) => {
          errors.push({
            message: `未闭合的 '${char}'`,
            severity: 'error',
            position: { line, column },
          })
        })
        return errors
      },
    },
  ],
}
