package com.citc.editor.common.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * @Description
 * @Author yzb
 * @Date 2024年09月18日
 */
@AllArgsConstructor
@Getter
public enum ErrorCodeEnum {

    DOWNLOAD_ERROR(500001, "下载失败"),
    ZIP_FILE_ERROR(500002, "压缩文件失败"),

    NO_AUTH_EDIT(400001, "没有权限编辑"),
    NO_AUTH_DEL(400002, "没有权限删除"),
    ;


    private final Integer code;

    private final String msg;
}
