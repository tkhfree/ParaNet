import type { MappingAlgorithm, OverrideToken } from 'antd/es/theme/interface'
import type { AliasToken } from 'antd/es/theme/internal'

const colorPrimary = '#4170ff'
const colorErrorHeavy = '#D94243'
const colorPrimaryHeavy = '#375FD9'
const colorTextDisabled = '#c5cee0'

// 变量地址参考: https://ant-design.antgroup.com/docs/react/customize-theme-cn#theme
const token: Partial<AliasToken> = {
  borderRadius: 4,
  colorBgContainerDisabled: '#EDF1F7',
  colorBorder: colorTextDisabled,
  colorError: '#ff4d4f',
  colorErrorActive: colorErrorHeavy,
  colorErrorHover: '#FF6869',
  colorLinkActive: colorPrimaryHeavy,
  colorLinkHover: colorPrimary,
  colorPrimary,
  colorPrimaryActive: colorPrimaryHeavy,
  colorPrimaryBgHover: '#83A2FF',
  colorPrimaryHover: '#5E85FF',
  colorSuccess: '#00c48c',
  colorText: '#c5cee0',
  colorTextDisabled,
  colorTextPlaceholder: colorTextDisabled,
  colorTextQuaternary: colorTextDisabled,
  colorTextSecondary: '#c5cee0',
  colorWarning: '#ffc245',
}

export default token

type ComponentsConfig = {
  [key in keyof OverrideToken]?: OverrideToken[key] & {
    algorithm?: boolean | MappingAlgorithm | MappingAlgorithm[]
  }
}

export const componentsToken: ComponentsConfig = {
  Breadcrumb: {
    itemColor: token.colorTextSecondary,
    lastItemColor: token.colorText,
    separatorColor: token.colorTextSecondary,
  },
  Calendar: {
    paddingXXS: 8,
  },
  Descriptions: {
    colorSplit: '#E4E9F2',
    labelBg: '#F6F9FB',
  },
  Input: {
    colorFillAlter: '#F6F9FB',
    colorIcon: token.colorTextDisabled,
    colorIconHover: token.colorPrimary,
  },
  Pagination: {
    itemActiveBg: token.colorPrimary,
  },
  Radio: {
    controlItemBgActiveDisabled: '#fff',
  },
  Select: {
    colorFillSecondary: '#EDF1F7',
    colorIcon: token.colorTextSecondary,
    controlItemBgHover: '#F5F8FF',
    paddingXXS: 8,
  },
  Switch: {
    colorTextTertiary: token.colorTextDisabled,
    opacityLoading: 0.25,
  },
  Tabs: {
    colorText: token.colorTextSecondary,
    itemHoverColor: token.colorPrimary,
  },
  Steps: {
    descriptionMaxWidth: 150,
  },
}
