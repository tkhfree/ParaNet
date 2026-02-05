package com.citc.editor.file.controller;

import com.citc.editor.common.R;
import com.citc.editor.common.exceptions.BadRequestException;
import com.citc.editor.file.service.CompileDeployRecordService;
import lombok.AllArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;

/**
 * 编译部署记录表
 */
@AllArgsConstructor
@RestController
@RequestMapping("/record")
public class CompileDeployRecordController {

    @Autowired
    private CompileDeployRecordService compileDeployRecordService;

    /**
     * 查询项目所有设备已部署模态数量and已加载模态数量
     * @param projectId
     * @return
     * @throws BadRequestException
     */
    @GetMapping("/getDeployCountByProjectId")
    public R getDeployCountByProjectId(@RequestParam(value = "projectId") Long projectId) throws BadRequestException {
        return compileDeployRecordService.getDeployCountByProjectId(projectId);
    }

    /**
     * 查询该项目的最新一次的前端编译的记录
     * @param projectId
     * @return
     * @throws BadRequestException
     */
    @GetMapping("/getFrontendCompileFiles")
    public R getFrontendCompileFiles(@RequestParam(value = "projectId") Long projectId) {
        return compileDeployRecordService.getFrontendCompileFiles(projectId);
    }

    /**
     * 读取前端编译结果文件内容
     * @param id
     * @return
     * @throws BadRequestException
     */
    @GetMapping("/getFrontendCompileFileContent")
    public R getFrontendCompileFileContent(@RequestParam(value = "id") Long id) throws BadRequestException, IOException {
        return compileDeployRecordService.getFrontendCompileFileContent(id);
    }

}
