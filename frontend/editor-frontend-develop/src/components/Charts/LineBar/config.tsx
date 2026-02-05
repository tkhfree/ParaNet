import * as echarts from 'echarts'

// 图表缺省配色
const defaultColors = [
  '#5470c6',
  '#91cc75',
  '#fac858',
  '#ee6666',
  '#73c0de',
  '#3ba272',
  '#fc8452',
  '#9a60b4',
  '#ea7ccc',
]
interface yAxisProps {
  areaStyle?: []
  key: string
  type: string
}
interface IProps {
  barWidth?: number
  boundaryGap?: boolean
  color?: []
  data: any[] // 图表数据
  interval?: any
  legend?: boolean
  theme?: string
  title: any // 标题
  tooltipType?: string
  xAxisKey: string //  x 轴 展示字段
  yAxisKey: any[] // y 轴数据展示字段
  yAxisName?: []
  yAxisUnit?: []
}

export const GetDefaultConfig = (props: IProps) => {
  const {
    barWidth = 20,
    boundaryGap = true,
    color = defaultColors,
    data = [],
    interval = '0',
    legend = false,
    theme = 'default',
    title = {},
    tooltipType = 'line',
    xAxisKey = '',
    yAxisKey = [],
    yAxisName = ['', ''],
    yAxisUnit = ['', ''],
  } = props

  const legendData = yAxisKey.map(obj => obj.key)
  const legendName = yAxisKey.map(obj => obj.name)
  const xAxisData = data.map(obj => obj[xAxisKey])
  const units = yAxisKey.map(obj => obj.unit)

  const series: any = []

  let max = 0
  for (const y of yAxisKey) {
    const list = data.map(obj => obj[y.key])
    const maxValua = list.reduce((a, b) => Math.max(a, b))
    if (max < maxValua) {
      max = maxValua
    }
  }

  // 背景xdata  渐变色柱状图   间隔色 两种  你可以设置多种
  const bgData: any = []
  if (data.length) {
    for (let i = 0; i < data.length; i++) {
      bgData.push(max + 40)
    }
  }
  for (const y of yAxisKey) {
    series.push({
      areaStyle: y.areaStyle
        ? {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              {
                color: y.areaStyle[0],
                offset: 0,
              },
              {
                color: y.areaStyle[1],
                offset: 1,
              },
            ]),
          }
        : null,
      boundaryGap: y.type === 'bar',
      data: data.map(i => i[y.key]).map(j => j || 0),

      itemStyle: {
        color: y.itemStyle
          ? new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { color: y.itemStyle[0], offset: 0 },
              { color: y.itemStyle[1], offset: 1 },
            ])
          : null,
      },
      name: y.name,
      showSymbol: false,
      smooth: 0.1,
      symbolSize: 5,
      type: y.type,
      yAxisIndex: y.yAxisIndex || 0,
    })
  }

  const option = {
    barWidth,
    color,
    grid: {
      bottom: theme === 'dark' ? 0 : 32,
      containLabel: true,
      left: 12,
      right: 24,
      top: title?.show || legend ? 40 : 24,
    },
    legend: {
      data: legendName,
      icon: 'rect',
      itemHeight: 8,
      itemWidth: 8,
      show: legend,
      type: 'scroll',
      left: 10,
      textStyle: {
        color: '#FFFFFFCC',
      },
    },

    series: series,
    title: {
      ...title,
      left: -3,
      textStyle: {
        color: theme === 'dark' ? '#909399' : '#7487A3',
        fontFamily: 'Source Han Sans CN',
        fontSize: 12,
        fontWeight: '400',
        textAlign: 'right',
        textBorderColor: 'transparent',
        textBorderWidth: 0,
        textShadowBlur: 0,
        textShadowColor: 'transparent',
      },
      top: 6,
    },
    toolbox: {
      show: false,
    },
    tooltip: {
      axisPointer: {
        label: {
          backgroundColor: '#fff',
          borderColor: 'rgba(0,0,0,0)',
          color: '#556677',
          shadowColor: 'rgba(0,0,0,0)',
          shadowOffsetY: 0,
          show: false,
        },

        lineStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { color: theme === 'dark' ? '#FFFFFF00' : '#4170FF00', offset: 0 },
            { color: theme === 'dark' ? '#FFFFFF' : '#4170FF', offset: 0.5 },
            { color: theme === 'dark' ? '#FFFFFF00' : '#4170FF00', offset: 1 },
          ]),
          type: 'solid',
          width: 2,
        },
        shadowStyle: {
          color:
            theme === 'dark'
              ? 'rgba(120, 206, 255, 0.04)'
              : new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { color: 'rgba(102, 163, 255, 0.0)', offset: 0 },
                  { color: 'rgba(102, 163, 255, 0.1)', offset: 0.5 },
                  { color: 'rgba(91, 143, 249, 0.2)', offset: 1 },
                ]),
        },
        type: tooltipType,
      },
      className: `echarts-tooltip ${theme}`,
      formatter: (params: any) => {
        // console.log(params, 'params')
        const titlName = `<div class="title-name ${theme}">${params[0]?.name}</div>`
        let seriesName = ''
        for (const ele of params) {
          seriesName += `<div class="series-item"><div class="series-name"><div class="dot"  style="background:${color[ele.seriesIndex]}"></div><div class="name"  >${ele.seriesName}</div></div><div class="value">${ele.value ? ele.value : '-'}${
            ele.value && units[ele.seriesIndex] ? units[ele.seriesIndex] : ''
          }</div></div>`
        }
        return `<div class="custom-tooltip">${titlName}${seriesName}</div>`
      },
      trigger: 'axis',
    },
    xAxis: {
      axisLabel: {
        backgroundColor: 'transparent',
        color: theme === 'dark' ? '#909399' : '#7487A3',
        fontSize: '12px',
        fontStyle: 'normal',
        interval: interval,
      },
      axisLine: {
        lineStyle: {
          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.10)' : '#ECF2FF',
        },
        show: false,
      },
      boundaryGap: boundaryGap ? ['10', '10'] : false,
      containLabel: true,
      data: xAxisData,
      // nameGap: 12,
      type: 'category',
    },
    yAxis: [
      {
        axisLabel: {
          color: theme === 'dark' ? '#FFFFFF99' : '#7487A3',
          fontFamily: 'Source Han Sans CN',
          fontSize: '12px',
          fontStyle: 'normal',
          formatter: (value: any) => (value && value !== '' ? value + (yAxisUnit?.[0] || '') : '-'),
          margin: 12,
        },
        axisLine: {
          lineStyle: {
            color: theme === 'dark' ? 'rgba(255, 255, 255, 0.10)' : '#ECF2FF',
          },
        },

        // minInterval: 1,
        nameGap: 12,

        splitLine: {
          show: theme === 'dark',
        },
        splitNumber: 5,
        type: 'value',
      },
      {
        axisLabel: {
          color: '#7487A3',
          fontFamily: 'Source Han Sans CN',
          fontSize: '12px',
          fontStyle: 'normal',
          formatter: (value: any) => (value && value !== '' ? value + yAxisUnit?.[1] : ''),
          margin: 12,
        },
        axisLine: {
          lineStyle: {
            color: theme === 'dark' ? 'rgba(255, 255, 255, 0.10)' : '#ECF2FF',
          },
        },
        axisTick: {
          show: false,
        },
        nameGap: 12,
        position: 'right',
        splitLine: {
          show: false,
        },
        splitNumber: 5,
        type: 'value',
      },
    ],
  }

  return option
}
