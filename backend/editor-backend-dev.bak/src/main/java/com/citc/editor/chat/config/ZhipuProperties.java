package com.citc.editor.chat.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "llm.zhipu")
public class ZhipuProperties {
    private Boolean enabled = Boolean.TRUE;

    private String apiUrl;

    private String apiKey;

    private String model = "glm-4-flash";

    private String systemPrompt;

    private Double temperature = 0.7D;

    private Integer maxTokens = 2048;
}
