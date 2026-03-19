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
public enum SysOpLogTypeEnum {

    LOGIN(1, "登录"),
    VIEW(2, "查看"),
    ADD(3, "新增"),
    EDIT(4, "编辑"),
    DELETE(5, "删除"),
    BATCH_DELETE(6, "批量删除"),
    IMPORT(7, "导入"),
    EXPORT(8, "导出"),
    CONFIRM(9, "确认"),
    ;

    private final Integer type;
    private final String name;


    public static String getNameByType(Integer type) {
        for (SysOpLogTypeEnum item : values()) {
            if (item.getType().equals(type)) {
                return item.getName();
            }
        }
        return "";
    }



}
