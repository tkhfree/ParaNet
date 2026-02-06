import React, { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'
import type { MetricData } from '@/model/monitor'
import styles from './index.module.less'

export interface MetricsChartProps {
  /** 图表标题 */
  title: string
  /** 时序数据，支持多系列 [{ name, data: MetricData[] }] */
  series: Array<{ name: string; data: MetricData[]; color?: string }>
  /** Y 轴单位 */
  unit?: string
  /** 高度 */
  height?: number
  /** 无数据时占位 */
  empty?: boolean
}

const formatTime = (ts: number) => {
  const d = new Date(ts)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
}

const MetricsChart: React.FC<MetricsChartProps> = ({
  title,
  series,
  unit = '',
  height = 280,
  empty = false,
}) => {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!chartRef.current) return
    chartInstance.current = echarts.init(chartRef.current)
    const handleResize = () => chartInstance.current?.resize()
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      chartInstance.current?.dispose()
      chartInstance.current = null
    }
  }, [])

  useEffect(() => {
    if (!chartInstance.current || empty) return

    const xData: string[] = []
    const hasData = series.some((s) => s.data.length > 0)
    if (!hasData) {
      chartInstance.current.setOption({ title: { text: '暂无数据', left: 'center', top: 'middle' } } as EChartsOption)
      return
    }

    // 取第一个系列的时间轴，或合并所有时间点去重排序
    const allTimes = new Set<number>()
    series.forEach((s) => s.data.forEach((d) => allTimes.add(d.timestamp)))
    const sortedTimes = Array.from(allTimes).sort((a, b) => a - b)
    sortedTimes.forEach((t) => xData.push(formatTime(t)))

    const option: EChartsOption = {
      title: { text: title, left: 8, top: 8, textStyle: { fontSize: 14 } },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
      },
      legend: {
        data: series.map((s) => s.name),
        bottom: 0,
      },
      grid: { left: 48, right: 24, top: 40, bottom: 36, containLabel: true },
      xAxis: {
        type: 'category',
        data: xData,
        boundaryGap: false,
        axisLabel: { fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        name: unit,
        axisLabel: { fontSize: 11 },
        splitLine: { lineStyle: { type: 'dashed', opacity: 0.4 } },
      },
      series: series.map((s) => {
        const valueByTime = new Map(s.data.map((d) => [d.timestamp, d.value]))
        const values = sortedTimes.map((t) => valueByTime.get(t) ?? '-')
        return {
          name: s.name,
          type: 'line',
          smooth: true,
          symbol: 'none',
          data: values,
          lineStyle: s.color ? { color: s.color } : undefined,
        }
      }),
    }
    chartInstance.current.setOption(option)
  }, [title, series, unit, empty])

  if (empty) {
    return (
      <div className={styles.wrapper} style={{ height }}>
        <div className={styles.empty}>暂无数据</div>
      </div>
    )
  }

  return (
    <div ref={chartRef} className={styles.wrapper} style={{ height }} />
  )
}

export default MetricsChart
