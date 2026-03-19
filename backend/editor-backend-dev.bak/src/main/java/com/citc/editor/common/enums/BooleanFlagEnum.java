package com.citc.editor.common.enums;

import lombok.Getter;

/**
 * 审核状态
 */
@Getter
public enum BooleanFlagEnum {
    /**
     * 未删除
     */
    NO(0, "否", false),
    /**
     * 已删除
     */
    YES(1, "是", true);

    private final Integer code;
    private final String desc;
    private final boolean flag;

    BooleanFlagEnum(int code, String desc, boolean flag) {
        this.code = code;
        this.desc = desc;
        this.flag = flag;
    }

}
