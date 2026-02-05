import { defineConfig, JSX_TOOLS } from '@vigour/scripts'

export default defineConfig({
  antdTheme: {
    file: './src/theme/index.ts',
  },
  assets: {
    jsxTools: JSX_TOOLS.ESBUILD,
  },
  html: {
    title: '集成开发系统',
  },
  lessVars: {
    file: './src/theme/globalVars.ts',
  },
  yagt: {
    url: 'http://10.10.48.32:30001',
    token: '77d5eca8c119adf18514e498ccee3894837e0f647ced0e55230a8ce66bb5435f',
  },
  buildInfo: true,
  webpackChain: webpackChain => {
    webpackChain.resolve.set('fallback', {
      assert: require.resolve('assert/'),
      http: require.resolve('stream-http'),
      https: require.resolve('https-browserify'),
      stream: require.resolve('stream-browserify'),
      util: require.resolve('util/'),
      zlib: require.resolve('browserify-zlib'),
    })
    return webpackChain
  },
})
