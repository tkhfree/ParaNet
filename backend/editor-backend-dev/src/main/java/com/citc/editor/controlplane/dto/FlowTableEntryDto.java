package com.citc.editor.controlplane.dto;

import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class FlowTableEntryDto {
    private Long projectId;

    private String deviceName;

    private String id;

    private String tableId;

    private Integer priority;

    private String matchRule;

    private String action;

    private Boolean enabled;

    private Long packetCount;

    private Long byteCount;

    private String remark;

    private String actionName;

    private List<Map<String, Object>> actionParams;

    private List<Map<String, Object>> matchFields;
}
