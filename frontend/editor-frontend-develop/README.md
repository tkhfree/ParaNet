# 集成开发系统

> create-vigour创建的React项目
> node 版本20.x

## 安装

```bash
yarn install
```

## 开发

```bash
npm run dev
```

## 打包

```bash
npm run build
```

## Vscode 插件

- `ESLint`
- `Prettier - Code formatter`
- `Stylelint`
- `CSS Modules`

## 配置 Vscode

在`Vscode`配置文件`settings.json`中添加如下配置

### 配置 Eslint+Prettier

```json
"editor.formatOnSave": true,
"editor.fontLigatures": true,
"svelte.enable-ts-plugin": true,
"explorer.confirmDelete": false,
"prettier.jsxSingleQuote": true,
"prettier.requireConfig": true,
"prettier.semi": false,
"prettier.singleQuote": true,
"prettier.arrowParens": "avoid",
"editor.codeActionsOnSave": {
    "source.fixAll": true
}
```

### 安装富文本插件wangeditor

```
yarn add @wangeditor/editor
### 或者 npm install @wangeditor/editor --save

yarn add @wangeditor/editor-for-vue
### 或者 npm install @wangeditor/editor-for-react --save
```
