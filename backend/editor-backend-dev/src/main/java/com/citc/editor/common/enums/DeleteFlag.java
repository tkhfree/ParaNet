package com.citc.editor.common.enums;

import lombok.Getter;

/**
 * 是否删除标识
 */
@Getter
public enum DeleteFlag {
    UNDELETED(0),
    DELETED(1),
    ;

    private final Integer code;

    DeleteFlag(Integer code) {
        this.code = code;
    }
}
