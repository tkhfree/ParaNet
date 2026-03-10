package com.citc.editor.controlplane.vo;

import lombok.Data;
import lombok.experimental.Accessors;

import java.util.List;
import java.util.Map;

@Data
@Accessors(chain = true)
public class FlowTableEntryVo {
    private String id;

    private String tableId;

    private Integer priority;

    private String matchRule;

    private String action;

    private Boolean enabled;

    private Long packetCount;

    private Long byteCount;

    private String remark;

    private String updatedAt;

    private String deviceIp;

    private String actionName;

    private List<Map<String, Object>> actionParams;

    private List<Map<String, Object>> matchFields;
}
