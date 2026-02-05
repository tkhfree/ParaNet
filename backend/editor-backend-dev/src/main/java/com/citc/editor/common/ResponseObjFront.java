package com.citc.editor.common;

import lombok.Data;
import lombok.experimental.Accessors;


@Data
@Accessors(chain = true)
public class ResponseObjFront {

	private String code;

	private String message;

	private String output_zip;

	public Boolean successFlag() {
		return "200".equals(code);
	}



}
