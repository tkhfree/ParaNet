package com.citc.editor.chat.dto;

import lombok.Data;

import java.util.List;

@Data
public class ChatRequestDto {
    private Long projectId;

    private Long currentFileId;

    private String projectName;

    private String currentFileName;

    private String currentFileContent;

    private List<ChatMessageDto> messages;
}
