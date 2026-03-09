package com.citc.editor.common.config.websocket;

import com.citc.editor.common.util.CommandUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.net.URI;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

/**
 * websocket终端处理器
 * @author yzb
 * @date 2025/4/8  
 */
@Component
@Slf4j
public class WebSocketTerminalHandler extends TextWebSocketHandler {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Map<String, CommandUtil> terminals = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String sessionId = session.getId();
        log.info("终端WebSocket连接建立: sessionId={}", sessionId);

        // 创建终端实例
        CommandUtil terminal = new CommandUtil(new CommandUtil.TerminalOutputListener() {
            @Override
            public void onOutput(String output) {
                try {
                    Map<String, Object> response = new HashMap<>();
                    response.put("type", "output");
                    response.put("sessionId", sessionId);
                    response.put("data", output);
                    session.sendMessage(new TextMessage(objectMapper.writeValueAsString(response)));
                } catch (IOException e) {
                    log.error("发送终端输出失败", e);
                }
            }

            @Override
            public void onExit(int exitCode) {
                try {
                    Map<String, Object> response = new HashMap<>();
                    response.put("type", "exit");
                    response.put("sessionId", sessionId);
                    response.put("code", exitCode);
                    session.sendMessage(new TextMessage(objectMapper.writeValueAsString(response)));
                } catch (IOException e) {
                    log.error("发送终端退出消息失败", e);
                }
            }
        });

        // 启动终端
        terminal.start();
        terminals.put(sessionId, terminal);
    }

    /**
     * 从WebSocket请求中提取终端ID
     * @author yzb
     * @date 2025/4/9
     */
    private String extractTerminalId(URI uri) {
        if (Objects.isNull(uri)) {
            log.error("WebSocket请求中缺少终端ID");
            return null;
        }
        String path = uri.getPath();
        String[] segments = path.split("/");
        return segments[segments.length - 1];
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String sessionId = session.getId();
        CommandUtil terminal = terminals.get(sessionId);

        if (terminal != null) {
            if (!message.getPayload().contains("type")) {
                String command = message.getPayload();
                log.info("1.终端WebSocket收到命令: {}", command);
                log.info("2.终端WebSocket收到指令,主要查看空格,删除等键盘操作: '{}'", command);
                // 处理特殊字符
//                command = handleSpecialChars(command);
                log.info("3.终端WebSocket收到指令,处理之后的命令: '{}'", command);
                // 发送命令到终端
                terminal.sendInput(command);
                return;
            }
            Map<String, Object> data = objectMapper.readValue(message.getPayload(), Map.class);
            String type = (String) data.get("type");

            switch (type) {
                case "command":
                    String command = (String) data.get("command");
                    // 处理特殊字符
                    command = handleSpecialChars(command);
                    // 发送命令到终端
                    terminal.sendInput(command);
                    break;
                case "input":
                    String input = (String) data.get("data");
                    input = handleSpecialChars(input);
                    terminal.sendInput(input);
                    break;
                case "resize":
                    terminal.resizeTerminal(
                            ((Number) data.get("cols")).intValue(),
                            ((Number) data.get("rows")).intValue()
                    );
                    break;
                default:
                    log.warn("未知的消息类型: {}", type);
            }
        }
    }

    /**
     * 处理特殊字符
     * 前端终端模拟器（如 xterm.js）发送的特殊键盘事件
     */
    private String handleSpecialChars(String command) {
        if (StringUtils.isBlank(command)) {
            return command;
        }
        // 去除前后空格
//        command = command.trim();
        switch (command) {
            case "13":  // 回车键 (Enter)
                return "\r";
            case "127": // 删除键 (Delete/Backspace)
                return "\u007f";
            case "9":   // Tab键
                return "\t";
            case "27":  // ESC键
                return "\u001b";
            case "3":   // Ctrl+C
                return "\u0003";
            case "4":   // Ctrl+D
                return "\u0004";
            case "26":  // Ctrl+Z
                return "\u001a";
            default:
                return command;
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        String sessionId = session.getId();
        log.info("终端WebSocket连接关闭: {}", sessionId);

        CommandUtil terminal = terminals.remove(sessionId);
        if (terminal != null) {
            terminal.shutdown();
        }
    }
}
