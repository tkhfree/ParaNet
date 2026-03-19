package com.citc.editor.chat.controller;

import com.citc.editor.chat.dto.ChatRequestDto;
import com.citc.editor.chat.service.ChatService;
import com.citc.editor.common.R;
import com.citc.editor.common.exceptions.BadRequestException;
import lombok.AllArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@AllArgsConstructor
@RestController
@RequestMapping("/chat")
public class ChatController {
    private final ChatService chatService;

    @PostMapping("/message")
    public R message(@RequestBody ChatRequestDto requestDto) throws BadRequestException {
        return R.ok(chatService.sendMessage(requestDto));
    }

    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@RequestBody ChatRequestDto requestDto) throws BadRequestException {
        return chatService.streamMessage(requestDto);
    }
}
