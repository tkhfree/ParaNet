package com.citc.editor.controlplane.vo;

import lombok.Data;
import lombok.experimental.Accessors;

@Data
@Accessors(chain = true)
public class ControlPlaneDeviceVo {
    private String deviceName;

    private String ip;

    private Integer flowCount;
}
