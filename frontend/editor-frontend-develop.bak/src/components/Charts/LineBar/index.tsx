import * as echarts from 'echarts'
import React, { useEffect, useRef } from 'react'

import { GetDefaultConfig } from './config'

const Charts = (props: any) => {
  const chartRef = useRef<HTMLDivElement>(null) // graph盒子
  const viewRef: any = useRef<any>(null)

  const {
    barWidth,
    boundaryGap,
    color,
    data,
    interval,
    legend,
    theme,
    title,
    tooltipType,
    xAxisKey,
    yAxisKey,
    yAxisName,
    yAxisUnit = [],
  } = props

  useEffect(() => {
    const myChart = echarts.init(chartRef.current)
    viewRef.current = myChart
  }, [])
  useEffect(() => {
    if (viewRef.current) {
      const defaultConfig: any = GetDefaultConfig({
        barWidth,
        boundaryGap,
        color,
        data,
        interval,
        legend,
        theme,
        title,
        tooltipType,

        xAxisKey,
        yAxisKey,
        yAxisUnit,
      })
      viewRef.current.setOption({
        ...defaultConfig,
      })
      viewRef.current.resize()
      window.addEventListener('resize', () => {
        viewRef.current.resize()
      })
    }
  }, [
    barWidth,
    boundaryGap,
    color,
    data,
    interval,
    legend,
    theme,
    title,
    tooltipType,
    xAxisKey,
    yAxisKey,
    yAxisUnit,
  ])
  return (
    <React.Fragment>
      <div ref={chartRef} style={{ height: '100%', width: '100%' }} />
    </React.Fragment>
  )
}

export default Charts
