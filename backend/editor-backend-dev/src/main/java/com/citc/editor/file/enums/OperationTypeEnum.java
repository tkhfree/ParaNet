package com.citc.editor.file.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * @Description
 * @Author yzb
 * @Date 2025年04月02日
 */
@AllArgsConstructor
@Getter
public enum OperationTypeEnum {

	// 前端编译、部署、后端编译
	FRONT_COMPILE(1, "前端编译"),
	DEPLOY(2, "部署"),
	BACKEND_COMPILE(3, "后端编译"),
	;

	private final int type;

	private final String name;
}
