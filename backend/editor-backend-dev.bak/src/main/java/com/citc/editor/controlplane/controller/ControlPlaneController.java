package com.citc.editor.controlplane.controller;

import com.citc.editor.common.R;
import com.citc.editor.common.exceptions.BadRequestException;
import com.citc.editor.controlplane.dto.FlowTableDeleteDto;
import com.citc.editor.controlplane.dto.FlowTableEntryDto;
import com.citc.editor.controlplane.service.ControlPlaneService;
import lombok.AllArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;

@AllArgsConstructor
@RestController
@RequestMapping("/control-plane")
public class ControlPlaneController {
    private final ControlPlaneService controlPlaneService;

    @GetMapping("/devices")
    public R listDevices(@RequestParam Long projectId) throws IOException, BadRequestException {
        return R.ok(controlPlaneService.listDevices(projectId));
    }

    @GetMapping("/flow-table")
    public R listFlowTable(@RequestParam Long projectId, @RequestParam String deviceName)
            throws IOException, BadRequestException {
        return R.ok(controlPlaneService.listFlowTable(projectId, deviceName));
    }

    @PostMapping("/flow-table/save")
    public R saveFlowTable(@RequestBody FlowTableEntryDto dto) throws IOException, BadRequestException {
        return R.ok(controlPlaneService.saveFlowTable(dto.getProjectId(), dto));
    }

    @PostMapping("/flow-table/delete")
    public R deleteFlowTable(@RequestBody FlowTableDeleteDto dto) throws IOException, BadRequestException {
        controlPlaneService.deleteFlowTable(dto.getProjectId(), dto);
        return R.ok();
    }

    @PostMapping("/flow-table/enable")
    public R enableFlowTable(@RequestBody FlowTableDeleteDto dto) throws IOException, BadRequestException {
        return R.ok(controlPlaneService.toggleFlowTable(dto.getProjectId(), dto, true));
    }

    @PostMapping("/flow-table/disable")
    public R disableFlowTable(@RequestBody FlowTableDeleteDto dto) throws IOException, BadRequestException {
        return R.ok(controlPlaneService.toggleFlowTable(dto.getProjectId(), dto, false));
    }
}
