package com.citc.editor.common.exceptions;

public class NotfoundException extends Exception {
    public NotfoundException() {
        super("数据未找到");
    }

    public NotfoundException(String message) {
        super(message);
    }
}
