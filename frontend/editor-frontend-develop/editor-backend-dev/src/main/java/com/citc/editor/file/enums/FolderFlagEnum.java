package com.citc.editor.file.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * @Description
 * @Author yzb
 * @Date 2025年03月31日
 */
@AllArgsConstructor
@Getter
public enum FolderFlagEnum {

	// 0：文件，1：文件夹
	FILE(0, "文件"),
	FOLDER(1, "文件夹");

	private Integer code;

	private String name;

	public static FolderFlagEnum getEnumByCode(Integer code) {
		for (FolderFlagEnum e : FolderFlagEnum.values()) {
			if (e.getCode().equals(code)) {
				return e;
			}
		}
		return null;
	}
}
