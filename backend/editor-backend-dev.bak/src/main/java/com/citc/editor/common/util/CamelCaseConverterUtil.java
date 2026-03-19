package com.citc.editor.common.util;

/**
 * @author zss
 * @date 2024/9/19 9:25
 */
public class CamelCaseConverterUtil {

    /**
     * 驼峰转换为下划线  camelCaseString 输出: camel_case_string
     *
     * @param camelCaseStr 参数
     * @return 结果
     */
    public static String convertToSnakeCase(String camelCaseStr) {
        StringBuilder builder = new StringBuilder();
        for (int i = 0; i < camelCaseStr.length(); i++) {
            char ch = camelCaseStr.charAt(i);
            if (Character.isUpperCase(ch)) {
                if (i > 0) {
                    builder.append('_');
                }
                builder.append(Character.toLowerCase(ch));
            } else {
                builder.append(ch);
            }
        }
        return builder.toString();
    }
}
