/**
 * ParaNet DSL 语言定义 - Monaco Monarch 语法高亮
 */
import type { languages } from 'monaco-editor'

export const PARANET_DSL_ID = 'paranet-dsl'

export const paranetDslConfiguration: languages.LanguageConfiguration = {
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
}

export const paranetDslDefinition: languages.IMonarchLanguage = {
  defaultToken: '',
  tokenPostfix: '.paranet',

  keywords: [
    'intent',
    'topology',
    'route',
    'policy',
    'flow',
    'match',
    'action',
    'forward',
    'drop',
    'apply',
    'from',
    'to',
    'via',
    'when',
    'allow',
    'deny',
    'prefix',
    'ndn',
    'ip',
    'geo',
    'p4',
    'device',
    'link',
    'network',
    'true',
    'false',
  ],

  operators: ['=', '>', '<', '!', ':', '==', '<=', '>=', '!=', '&&', '||', '+', '-', '*', '/'],

  symbols: /[=><!?:&|+\-*\/\^%]+/,
  escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

  tokenizer: {
    root: [
      [/[a-zA-Z_][\w]*/, { cases: { '@keywords': 'keyword', '@default': 'identifier' } }],
      { include: '@whitespace' },
      [/\d+\.\d+([eE][\-+]?\d+)?[fFdD]?/, 'number.float'],
      [/\d+[lL]?/, 'number'],
      [/[{}()\[\]]/, '@brackets'],
      [/@symbols/, { cases: { '@operators': 'operator', '@default': '' } }],
      [/"([^"\\]|\\.)*$/, 'string.invalid'],
      [/"/, 'string', '@string_double'],
      [/'([^'\\]|\\.)*$/, 'string.invalid'],
      [/'/, 'string', '@string_single'],
    ],
    whitespace: [
      [/\s+/, 'white'],
      [/\/\/.*$/, 'comment'],
      [/\/\*/, 'comment', '@comment_block'],
    ],
    comment_block: [
      [/\*\//, 'comment', '@pop'],
      [/.+/, 'comment'],
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
}
