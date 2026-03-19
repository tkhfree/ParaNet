package com.citc.editor.file.controller;


import com.citc.editor.common.R;
import com.citc.editor.common.exceptions.BadRequestException;
import com.citc.editor.file.service.RemoteCallService;
import lombok.AllArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.time.LocalDateTime;

/**
 * 编译、部署相关接口
 */
@AllArgsConstructor
@RestController
@RequestMapping("/remote")
public class RemoteCallController {

    @Autowired
    private RemoteCallService remoteCallService;


    /**
     * 前端编译
     * @param projectId 项目ID
     * @return
     * @throws Exception
     */
    @PostMapping("/frontendCompile")
    public R frontendCompile(@RequestParam(value = "projectId", required = true) Long projectId) {
        return remoteCallService.frontendCompile(projectId);
    }

    /**
     * 部署
     * @param projectId
     * @param deviceName
     * @return
     */
    @PostMapping("/deploy")
    public R deploy(@RequestParam(value = "projectId") Long projectId, @RequestParam(value = "deviceName") String deviceName) throws BadRequestException, IOException {
        return remoteCallService.deploy(projectId, deviceName);
    }


    /**
     * 后端编译
     * @param projectId
     * @param deviceName
     * @return
     */
    @PostMapping("/backendCompile")
    public R backendCompile(@RequestParam(value = "projectId") Long projectId, @RequestParam(value = "deviceName") String deviceName) throws BadRequestException, IOException {
        return remoteCallService.backendCompile(projectId, deviceName);
    }

    /**
     * 一键操作(前端编译+部署+后端编译)
     * @param projectId
     * @return
     */
    @PostMapping("/easyShuttle")
    public R easyShuttle(@RequestParam(value = "projectId") Long projectId) throws BadRequestException, IOException {
        return remoteCallService.easyShuttle(projectId);
    }

    /**
     * 获取项目前端编译日志
     * @param projectId
     * @return
     */
    @GetMapping("/getCompileFrontendLog")
    public R getCompileFrontendLog(@RequestParam(value = "projectId") Long projectId) {
        return R.ok(String.format("%n前端编译返回结果为:%s", remoteCallService.compileFrontendLog(projectId, LocalDateTime.now())));
    }

    /**
     * 获取项目设备后端编译日志
     * @param projectId
     * @param ip
     * @return
     */
    @GetMapping("/compileBackendLog")
    public R compileBackendLog(@RequestParam(value = "projectId") Long projectId, @RequestParam(value = "ip") String ip) throws BadRequestException, IOException {
        return R.ok(String.format("%n设备%s后端编译返回结果为:%s", ip, remoteCallService.compileBackendLog(projectId, ip, LocalDateTime.now())));
    }


}
