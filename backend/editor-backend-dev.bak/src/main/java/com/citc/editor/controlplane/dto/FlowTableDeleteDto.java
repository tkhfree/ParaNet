package com.citc.editor.controlplane.dto;

import lombok.Data;

@Data
public class FlowTableDeleteDto {
    private Long projectId;

    private String deviceName;

    private String id;
}
