/// <reference types="vite/client" />

declare module '*.less' {
  const classes: { [key: string]: string }
  export default classes
}

declare module '*.svg?url' {
  const url: string
  export default url
}
