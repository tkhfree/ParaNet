package com.citc.editor.common;

import lombok.Data;
import lombok.experimental.Accessors;

/**
 * @Description
 * @Author yzb
 * @Date 2025年04月02日
 */
@Data
@Accessors(chain = true)
public class ResponseObj {

	private String code;

	private String message;

	private Object log_content;

	public Boolean successFlag() {
		return "200".equals(code);
	}



}
