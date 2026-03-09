package com.citc.editor.chat.service;

import com.citc.editor.chat.config.ZhipuProperties;
import com.citc.editor.chat.dto.ChatMessageDto;
import com.citc.editor.chat.dto.ChatRequestDto;
import com.citc.editor.chat.vo.ChatResponseVo;
import com.citc.editor.common.exceptions.BadRequestException;
import com.citc.editor.common.exceptions.BusinessException;
import com.citc.editor.common.util.JsonUtil;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;

@Slf4j
@Service
@AllArgsConstructor
public class ChatService {
    private static final int CONTEXT_MAX_LENGTH = 8000;
    private static final int MAX_TOOL_ROUNDS = 5;
    private static final int STREAM_CHUNK_SIZE = 80;

    private final ZhipuProperties zhipuProperties;
    private final ChatToolService chatToolService;

    public ChatResponseVo sendMessage(ChatRequestDto requestDto) throws BadRequestException {
        validateConfig();
        validateRequest(requestDto);

        ChatRunResult result = completeWithTools(requestDto, toolMessage -> {
        });
        return new ChatResponseVo()
                .setModel(zhipuProperties.getModel())
                .setReply(result.getReply());
    }

    public SseEmitter streamMessage(ChatRequestDto requestDto) throws BadRequestException {
        validateConfig();
        validateRequest(requestDto);

        SseEmitter emitter = new SseEmitter(300000L);
        CompletableFuture.runAsync(() -> {
            try {
                ChatRunResult result = completeWithTools(requestDto, toolMessage ->
                        sendEvent(emitter, "tool", buildEventData("message", toolMessage, "model", zhipuProperties.getModel())));
                streamReply(emitter, result.getReply());
                sendEvent(emitter, "done", buildEventData("content", result.getReply(), "model", zhipuProperties.getModel()));
                emitter.complete();
            } catch (Exception exception) {
                log.error("流式对话失败", exception);
                sendEvent(emitter, "error", buildEventData("message", exception.getMessage(), "model", zhipuProperties.getModel()));
                emitter.complete();
            }
        });
        return emitter;
    }

    private ChatRunResult completeWithTools(ChatRequestDto requestDto, ToolEventListener listener) throws BadRequestException {
        List<Map<String, Object>> messages = buildMessages(requestDto);

        for (int round = 0; round < MAX_TOOL_ROUNDS; round++) {
            Map<String, Object> response = requestModel(messages, true);
            ChatCompletion completion = parseCompletion(response);

            if (CollectionUtils.isEmpty(completion.getToolCalls())) {
                String reply = StringUtils.defaultIfBlank(completion.getContent(), "已完成操作，但模型没有返回额外说明。");
                return new ChatRunResult(reply);
            }

            messages.add(buildAssistantToolCallMessage(completion));
            for (Map<String, Object> toolCall : completion.getToolCalls()) {
                String toolId = Objects.toString(toolCall.get("id"), "");
                @SuppressWarnings("unchecked")
                Map<String, Object> function = (Map<String, Object>) toolCall.get("function");
                String toolName = function == null ? "" : Objects.toString(function.get("name"), "");
                String argumentJson = function == null ? "{}" : Objects.toString(function.get("arguments"), "{}");
                Map<String, Object> arguments = parseArguments(argumentJson);

                listener.onTool("正在调用工具：" + toolName);
                String toolResult;
                try {
                    toolResult = chatToolService.executeTool(toolName, arguments, requestDto);
                    listener.onTool("工具 " + toolName + " 执行完成");
                } catch (Exception exception) {
                    log.error("工具执行失败，toolName={}, args={}", toolName, argumentJson, exception);
                    toolResult = "工具执行失败：" + exception.getMessage();
                    listener.onTool("工具 " + toolName + " 执行失败");
                }

                messages.add(buildToolMessage(toolId, toolName, toolResult));
            }
        }

        throw new BusinessException("工具调用次数过多，请缩小问题范围后重试");
    }

    private Map<String, Object> requestModel(List<Map<String, Object>> messages, boolean enableTools) {
        Map<String, Object> requestBody = new LinkedHashMap<>();
        requestBody.put("model", zhipuProperties.getModel());
        requestBody.put("stream", false);
        requestBody.put("temperature", zhipuProperties.getTemperature());
        requestBody.put("max_tokens", zhipuProperties.getMaxTokens());
        requestBody.put("messages", messages);
        if (enableTools) {
            requestBody.put("tools", buildTools());
        }

        try {
            return createZhipuClient()
                    .post()
                    .uri(zhipuProperties.getApiUrl())
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block();
        } catch (WebClientResponseException exception) {
            log.error("智谱接口调用失败，status={}, body={}",
                    exception.getRawStatusCode(),
                    exception.getResponseBodyAsString(),
                    exception);
            throw new BusinessException("智谱接口调用失败：" + exception.getResponseBodyAsString());
        } catch (BusinessException exception) {
            throw exception;
        } catch (Exception exception) {
            log.error("智谱接口调用异常", exception);
            throw new BusinessException("调用智谱接口失败，请稍后重试");
        }
    }

    private void validateConfig() {
        if (!Boolean.TRUE.equals(zhipuProperties.getEnabled())) {
            throw new BusinessException("大模型能力未启用，请检查 llm-config.properties");
        }
        if (StringUtils.isBlank(zhipuProperties.getApiKey())) {
            throw new BusinessException("请先在 llm-config.properties 中配置 llm.zhipu.api-key");
        }
        if (StringUtils.isBlank(zhipuProperties.getApiUrl())) {
            throw new BusinessException("请先在 llm-config.properties 中配置 llm.zhipu.api-url");
        }
        if (StringUtils.isBlank(zhipuProperties.getModel())) {
            throw new BusinessException("请先在 llm-config.properties 中配置 llm.zhipu.model");
        }
    }

    private void validateRequest(ChatRequestDto requestDto) throws BadRequestException {
        if (requestDto == null || requestDto.getMessages() == null || requestDto.getMessages().isEmpty()) {
            throw new BadRequestException("对话消息不能为空");
        }
        ChatMessageDto latestMessage = requestDto.getMessages().get(requestDto.getMessages().size() - 1);
        if (latestMessage == null || StringUtils.isBlank(latestMessage.getContent())) {
            throw new BadRequestException("最后一条消息内容不能为空");
        }
    }

    private List<Map<String, Object>> buildMessages(ChatRequestDto requestDto) {
        List<Map<String, Object>> messages = new ArrayList<>();

        if (StringUtils.isNotBlank(zhipuProperties.getSystemPrompt())) {
            messages.add(buildMessage("system", zhipuProperties.getSystemPrompt()));
        }

        String contextMessage = buildContextMessage(requestDto);
        if (StringUtils.isNotBlank(contextMessage)) {
            messages.add(buildMessage("system", contextMessage));
        }

        messages.add(buildMessage(
                "system",
                "你现在可以根据用户需求自主决定是否调用工具。只有在确实需要读取项目内容、修改文件、编译、部署或查询日志时才调用工具。完成工具调用后，请继续用中文给出清晰结论。"
        ));

        for (ChatMessageDto item : requestDto.getMessages()) {
            if (item == null || StringUtils.isBlank(item.getContent())) {
                continue;
            }
            messages.add(buildMessage(normalizeRole(item.getRole()), item.getContent().trim()));
        }

        return messages;
    }

    private String buildContextMessage(ChatRequestDto requestDto) {
        List<String> parts = new ArrayList<>();

        if (requestDto.getProjectId() != null) {
            parts.add("当前项目ID：" + requestDto.getProjectId());
        }
        if (requestDto.getCurrentFileId() != null) {
            parts.add("当前文件ID：" + requestDto.getCurrentFileId());
        }
        if (StringUtils.isNotBlank(requestDto.getProjectName())) {
            parts.add("当前项目名称：" + requestDto.getProjectName().trim());
        }
        if (StringUtils.isNotBlank(requestDto.getCurrentFileName())) {
            parts.add("当前文件：" + requestDto.getCurrentFileName().trim());
        }
        if (StringUtils.isNotBlank(requestDto.getCurrentFileContent())) {
            parts.add("当前文件内容如下：\n" + truncate(requestDto.getCurrentFileContent().trim()));
        }
        if (requestDto.getProjectId() != null) {
            try {
                parts.add("当前项目文件树：\n" + chatToolService.getProjectFileTree(requestDto.getProjectId()));
            } catch (Exception exception) {
                log.warn("获取项目文件树上下文失败, projectId={}", requestDto.getProjectId(), exception);
            }
        }

        return String.join("\n", parts);
    }

    private Map<String, Object> buildMessage(String role, String content) {
        Map<String, Object> message = new LinkedHashMap<>();
        message.put("role", role);
        message.put("content", content);
        return message;
    }

    private String normalizeRole(String role) {
        if ("assistant".equals(role) || "system".equals(role) || "tool".equals(role)) {
            return role;
        }
        return "user";
    }

    private WebClient createZhipuClient() {
        return WebClient.builder()
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + zhipuProperties.getApiKey())
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    @SuppressWarnings("unchecked")
    private ChatCompletion parseCompletion(Map<String, Object> response) {
        if (response == null) {
            throw new BusinessException("智谱接口未返回内容");
        }
        Object choicesObj = response.get("choices");
        if (!(choicesObj instanceof List) || ((List<?>) choicesObj).isEmpty()) {
            throw new BusinessException("智谱接口返回格式异常，缺少 choices");
        }
        Object firstChoice = ((List<?>) choicesObj).get(0);
        if (!(firstChoice instanceof Map)) {
            throw new BusinessException("智谱接口返回格式异常，choices[0] 无效");
        }
        Object messageObj = ((Map<String, Object>) firstChoice).get("message");
        if (!(messageObj instanceof Map)) {
            throw new BusinessException("智谱接口返回格式异常，缺少 message");
        }
        Map<String, Object> message = (Map<String, Object>) messageObj;
        ChatCompletion completion = new ChatCompletion();
        completion.setContent(Objects.toString(message.get("content"), ""));
        Object toolCalls = message.get("tool_calls");
        if (toolCalls instanceof List) {
            completion.setToolCalls((List<Map<String, Object>>) toolCalls);
        } else {
            completion.setToolCalls(new ArrayList<>());
        }
        return completion;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseArguments(String argumentJson) {
        if (StringUtils.isBlank(argumentJson)) {
            return new LinkedHashMap<>();
        }
        try {
            return JsonUtil.fromJson(argumentJson, Map.class);
        } catch (Exception exception) {
            log.warn("解析工具参数失败: {}", argumentJson, exception);
            return new LinkedHashMap<>();
        }
    }

    private Map<String, Object> buildAssistantToolCallMessage(ChatCompletion completion) {
        Map<String, Object> message = new LinkedHashMap<>();
        message.put("role", "assistant");
        message.put("content", completion.getContent());
        message.put("tool_calls", completion.getToolCalls());
        return message;
    }

    private Map<String, Object> buildToolMessage(String toolCallId, String toolName, String toolResult) {
        Map<String, Object> message = new LinkedHashMap<>();
        message.put("role", "tool");
        message.put("tool_call_id", toolCallId);
        message.put("name", toolName);
        message.put("content", toolResult);
        return message;
    }

    private List<Map<String, Object>> buildTools() {
        return Arrays.asList(
                buildTool("create_project", "创建新项目。",
                        schema(new LinkedHashMap<String, Object>() {{
                            put("name", stringProperty("项目名称，只能包含中文、字母、数字和下划线"));
                            put("remark", stringProperty("项目备注，可选"));
                        }}, "name")),
                buildTool("update_project", "更新当前项目或指定项目的信息。",
                        schema(new LinkedHashMap<String, Object>() {{
                            put("projectId", numberProperty("项目ID，可选，默认当前项目"));
                            put("name", stringProperty("新的项目名称"));
                            put("remark", stringProperty("新的项目备注，可选"));
                        }}, "name")),
                buildTool("get_project_file_tree", "获取当前项目的完整文件树结构，适合在分析项目结构前调用。",
                        schema(new LinkedHashMap<String, Object>() {{
                            put("projectId", numberProperty("项目ID，可选，默认当前项目"));
                        }})),
                buildTool("create_project_file", "在项目中创建文件或文件夹。",
                        schema(new LinkedHashMap<String, Object>() {{
                            put("projectId", numberProperty("项目ID，可选，默认当前项目"));
                            put("fileName", stringProperty("文件名或文件夹名"));
                            put("isFolder", booleanProperty("是否创建为文件夹，true 表示文件夹，false 表示普通文件"));
                            put("fileType", numberProperty("创建普通文件时必须提供，0=topology/json,1=pne,2=其他,4=p4,5=domain"));
                            put("content", stringProperty("创建普通文件时的初始内容，可选"));
                            put("parentId", numberProperty("父文件夹ID，可选"));
                            put("parentFolderName", stringProperty("父文件夹名称，可选"));
                        }}, "fileName")),
                buildTool("read_project_file", "读取项目中的文件内容。优先传 fileId；如果没有 fileId，可以传 fileName。",
                        schema(new LinkedHashMap<String, Object>() {{
                            put("projectId", numberProperty("项目ID，可选，默认当前项目"));
                            put("fileId", numberProperty("文件ID，可选"));
                            put("fileName", stringProperty("文件名，可选，例如 path.json 或 topology.json"));
                        }})),
                buildTool("save_project_file", "保存项目文件内容。只有在用户明确要求修改或保存文件时才调用。",
                        schema(new LinkedHashMap<String, Object>() {{
                            put("projectId", numberProperty("项目ID，可选，默认当前项目"));
                            put("fileId", numberProperty("文件ID，可选"));
                            put("fileName", stringProperty("文件名，可选"));
                            put("content", stringProperty("要写入文件的完整内容"));
                        }}, "content")),
                buildTool("rename_project_file", "重命名项目中的文件或文件夹。",
                        schema(new LinkedHashMap<String, Object>() {{
                            put("projectId", numberProperty("项目ID，可选，默认当前项目"));
                            put("fileId", numberProperty("文件ID，可选"));
                            put("fileName", stringProperty("原文件名，可选"));
                            put("newName", stringProperty("新名称"));
                        }}, "newName")),
                buildTool("move_project_file", "移动项目中的文件或文件夹到新的目录。",
                        schema(new LinkedHashMap<String, Object>() {{
                            put("projectId", numberProperty("项目ID，可选，默认当前项目"));
                            put("fileId", numberProperty("文件ID，可选"));
                            put("fileName", stringProperty("要移动的文件名，可选"));
                            put("targetParentId", numberProperty("目标父文件夹ID，可选"));
                            put("targetParentName", stringProperty("目标父文件夹名称，可选"));
                            put("moveToRoot", booleanProperty("是否移动到项目根目录"));
                        }})),
                buildTool("delete_project_file", "删除项目中的文件或文件夹。只有在用户明确要求删除时才调用。",
                        schema(new LinkedHashMap<String, Object>() {{
                            put("projectId", numberProperty("项目ID，可选，默认当前项目"));
                            put("fileId", numberProperty("文件ID，可选"));
                            put("fileName", stringProperty("文件名，可选"));
                        }})),
                buildTool("list_project_devices", "读取项目中的设备名称与IP列表，部署或后端编译前可先调用。",
                        schema(new LinkedHashMap<String, Object>() {{
                            put("projectId", numberProperty("项目ID，可选，默认当前项目"));
                        }})),
                buildTool("frontend_compile", "调用项目的前端编译接口。",
                        schema(new LinkedHashMap<String, Object>() {{
                            put("projectId", numberProperty("项目ID，可选，默认当前项目"));
                        }})),
                buildTool("deploy_project", "调用项目的部署接口。调用前应确认 deviceName。",
                        schema(new LinkedHashMap<String, Object>() {{
                            put("projectId", numberProperty("项目ID，可选，默认当前项目"));
                            put("deviceName", stringProperty("设备名称，必须与项目中的设备名称一致"));
                        }}, "deviceName")),
                buildTool("backend_compile", "调用设备的后端编译接口。调用前应确认 deviceName。",
                        schema(new LinkedHashMap<String, Object>() {{
                            put("projectId", numberProperty("项目ID，可选，默认当前项目"));
                            put("deviceName", stringProperty("设备名称，必须与项目中的设备名称一致"));
                        }}, "deviceName")),
                buildTool("query_project_log", "查询前端编译日志、部署日志或后端编译日志。",
                        schema(new LinkedHashMap<String, Object>() {{
                            put("projectId", numberProperty("项目ID，可选，默认当前项目"));
                            put("logType", enumProperty("日志类型", Arrays.asList("frontend_compile", "deploy", "backend_compile")));
                            put("deviceName", stringProperty("设备名称，可选。查询 deploy 或 backend_compile 时建议传"));
                            put("ip", stringProperty("设备IP，可选"));
                        }}, "logType")),
                buildTool("get_frontend_compile_files", "获取当前项目最近一次前端编译生成的产物列表。",
                        schema(new LinkedHashMap<String, Object>() {{
                            put("projectId", numberProperty("项目ID，可选，默认当前项目"));
                        }})),
                buildTool("read_frontend_compile_file", "读取某个前端编译产物的内容。",
                        schema(new LinkedHashMap<String, Object>() {{
                            put("projectId", numberProperty("项目ID，可选，默认当前项目"));
                            put("recordId", numberProperty("前端编译产物记录ID"));
                        }}, "recordId"))
        );
    }

    private Map<String, Object> buildTool(String name, String description, Map<String, Object> parameters) {
        Map<String, Object> function = new LinkedHashMap<>();
        function.put("name", name);
        function.put("description", description);
        function.put("parameters", parameters);

        Map<String, Object> tool = new LinkedHashMap<>();
        tool.put("type", "function");
        tool.put("function", function);
        return tool;
    }

    private Map<String, Object> schema(Map<String, Object> properties, String... requiredFields) {
        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("type", "object");
        schema.put("properties", properties);
        if (requiredFields != null && requiredFields.length > 0) {
            schema.put("required", Arrays.asList(requiredFields));
        }
        return schema;
    }

    private Map<String, Object> stringProperty(String description) {
        Map<String, Object> property = new LinkedHashMap<>();
        property.put("type", "string");
        property.put("description", description);
        return property;
    }

    private Map<String, Object> numberProperty(String description) {
        Map<String, Object> property = new LinkedHashMap<>();
        property.put("type", "number");
        property.put("description", description);
        return property;
    }

    private Map<String, Object> booleanProperty(String description) {
        Map<String, Object> property = new LinkedHashMap<>();
        property.put("type", "boolean");
        property.put("description", description);
        return property;
    }

    private Map<String, Object> enumProperty(String description, List<String> values) {
        Map<String, Object> property = stringProperty(description);
        property.put("enum", values);
        return property;
    }

    private void streamReply(SseEmitter emitter, String reply) {
        String content = StringUtils.defaultIfBlank(reply, "已完成，但模型未返回文本内容。");
        int index = 0;
        while (index < content.length()) {
            int end = Math.min(index + STREAM_CHUNK_SIZE, content.length());
            sendEvent(emitter, "delta", buildEventData("content", content.substring(index, end), "model", zhipuProperties.getModel()));
            index = end;
            try {
                Thread.sleep(15L);
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                throw new BusinessException("流式回复被中断");
            }
        }
    }

    private Map<String, Object> buildEventData(Object... keyValues) {
        Map<String, Object> payload = new LinkedHashMap<>();
        for (int i = 0; i + 1 < keyValues.length; i += 2) {
            payload.put(String.valueOf(keyValues[i]), keyValues[i + 1]);
        }
        return payload;
    }

    private void sendEvent(SseEmitter emitter, String name, Map<String, Object> payload) {
        try {
            emitter.send(SseEmitter.event().name(name).data(JsonUtil.toJson(payload)));
        } catch (Exception exception) {
            log.warn("发送 SSE 事件失败, name={}", name, exception);
        }
    }

    private String truncate(String content) {
        if (content.length() <= CONTEXT_MAX_LENGTH) {
            return content;
        }
        return content.substring(0, CONTEXT_MAX_LENGTH) + "\n...(内容过长，已截断)";
    }

    @Data
    private static class ChatCompletion {
        private String content;
        private List<Map<String, Object>> toolCalls;
    }

    @Data
    @AllArgsConstructor
    private static class ChatRunResult {
        private String reply;
    }

    @FunctionalInterface
    private interface ToolEventListener {
        void onTool(String toolMessage);
    }
}
