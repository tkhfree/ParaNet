package com.citc.editor.common.enums;

import com.citc.editor.common.exceptions.NotfoundException;
import lombok.Getter;

/**
 * 检查结果枚举
 */
@Getter
public enum CheckResult {
    UNDO(0, "未开始"),
    NORMAL(1, "正常"),
    ABNORMAL(2, "异常"),
    ;

    private final Integer code;
    private final String desc;

    CheckResult(Integer code, String desc) {
        this.code = code;
        this.desc = desc;
    }

    public static CheckResult getByCode(Integer code) throws NotfoundException {
        for (CheckResult checkResult : CheckResult.values()) {
            if (checkResult.getCode().equals(code)) {
                return checkResult;
            }
        }
        throw new NotfoundException("未找到枚举状态");
    }

    public static String getDescByCode(Integer code) {
        try {
            return getByCode(code).getDesc();
        } catch (Exception e) {
            return e.getMessage();
        }
    }
}
