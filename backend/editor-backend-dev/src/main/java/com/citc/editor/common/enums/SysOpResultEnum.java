package com.citc.editor.common.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * @Description 系统操作日志
 * @Author yzb
 * @Date 2024年11月14日
 */
@AllArgsConstructor
@Getter
public enum SysOpResultEnum {

    SUCCESS(1, "成功"),
    FAIL(2, "失败"),
    ;

    private final Integer type;
    private final String name;


    public static String getNameByType(Integer type) {
        for (SysOpResultEnum item : values()) {
            if (item.getType().equals(type)) {
                return item.getName();
            }
        }
        return "";
    }
}
