package com.citc.editor.file.controller;

import com.citc.editor.common.R;
import com.citc.editor.common.exceptions.BadRequestException;
import com.citc.editor.file.dto.ProjectDto;
import com.citc.editor.file.service.ProjectService;
import lombok.AllArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;

@AllArgsConstructor
@RestController
@RequestMapping("/project")
public class ProjectController {

    @Autowired
    private ProjectService projectService;

    /**
     * 创建项目
     * @param projectDto 项目信息
     * @return 项目实体
     */
    @PostMapping("/createProject")
    public R createProject(@RequestBody ProjectDto projectDto) throws BadRequestException {
        return R.ok(projectService.createProject(projectDto));
    }

    /**
     * 更新项目
     * @param projectDto 项目信息
     */
    @PostMapping("/updateProject")
    public R updateProject(@RequestBody ProjectDto projectDto) throws BadRequestException {
        projectService.updateProject(projectDto);
        return R.ok();
    }

    /**
     * 删除项目
     * @param id 项目ID
     */
    @GetMapping("/deleteProject/{id}")
    public R deleteProject(@PathVariable Long id) throws BadRequestException, IOException {
        projectService.deleteProject(id);
        return R.ok();
    }

    /**
     * 获取项目详情
     * @param id 项目ID
     * @return 项目信息
     */
    @GetMapping("/getProject/{id}")
    public R getProject(@PathVariable Long id) throws BadRequestException {
        return R.ok(projectService.getProject(id));
    }

    /**
     * 获取项目列表
     * @return 项目列表
     */
    @GetMapping("/projectList")
    public R getProjectList() {
        return R.ok(projectService.getProjectList());
    }

    /**
     * 检查项目名称是否存在
     * @param name 项目名称
     * @return 是否存在
     */
    @GetMapping("/checkProjectNameExists")
    public R checkProjectNameExists(@RequestParam String name, @RequestParam(required = false) Long excludeId) {
        return R.ok(projectService.checkProjectNameExists(name, excludeId));
    }
}
