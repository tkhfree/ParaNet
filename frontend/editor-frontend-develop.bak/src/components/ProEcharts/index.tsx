import * as echarts from 'echarts'
import React from 'react'

interface Props {
  option: echarts.EChartsOption
  onClick?: (params: any) => void
}

const ProEcharts: React.FC<Props> = props => {
  const chartRef = React.useRef(null)

  const [chart, setChart] = React.useState<echarts.ECharts>()

  React.useEffect(() => {
    if (chart) {
      chart.clear()
      chart.setOption(props.option)
      return
    }

    const _chart = echarts.init(chartRef.current as any as HTMLElement)
    // const _chart = echarts.init(
    //   chartRef.current as any as HTMLElement,
    //   undefined,
    //   { renderer: "svg" }
    // );
    if (props.onClick) {
      _chart.on('click', (params: any) => {
        props.onClick?.(params)
      })
    }
    _chart.setOption(props.option)
    setChart(_chart)
  }, [chart, props, props.option])

  React.useEffect(() => {
    const handleResize = () => chart?.resize()
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [chart])
  React.useEffect(() => {
    return () => {
      if (chart) {
        chart.dispose()
      }
    }
  }, [chart])

  return <div ref={chartRef} style={{ height: '100%', width: '100%' }} />
}

export default ProEcharts
