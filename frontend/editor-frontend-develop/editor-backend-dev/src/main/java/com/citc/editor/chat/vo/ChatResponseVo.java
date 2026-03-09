package com.citc.editor.chat.vo;

import lombok.Data;
import lombok.experimental.Accessors;

@Data
@Accessors(chain = true)
public class ChatResponseVo {
    private String reply;

    private String model;
}
