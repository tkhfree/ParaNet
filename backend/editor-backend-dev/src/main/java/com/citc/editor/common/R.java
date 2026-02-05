package com.citc.editor.common;

import lombok.Data;
import org.springframework.http.HttpStatus;

@Data
public class R {
    private Integer code = 0;
    private String msg = "";
    private Object data;

    public static R ok() {
        return new R();
    }

    public static R ok(Object data) {
        R r = new R();
        r.data = data;
        return r;
    }

    public static R error(String msg) {
        R r = new R();
        r.code = HttpStatus.INTERNAL_SERVER_ERROR.value();
        r.msg = msg;
        return r;
    }

    public static R error(int code, String msg) {
        R r = new R();
        r.code = code;
        r.msg = msg;
        return r;
    }
}
