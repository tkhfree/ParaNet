package com.citc.editor.file.service;

import java.io.IOException;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import com.citc.editor.file.mapper.CompileDeployRecordMapper;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.citc.editor.common.exceptions.BadRequestException;
import com.citc.editor.file.dto.ProjectDto;
import com.citc.editor.file.entity.ProjectEntity;
import com.citc.editor.file.mapper.ProjectMapper;
import com.citc.editor.file.vo.ProjectVo;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class ProjectService {

    @Autowired
    private ProjectMapper projectMapper;

    @Autowired
    private FileService fileService;

    @Autowired
    private FileStorageService fileStorageService;

    @Autowired
    private CompileDeployRecordMapper compileDeployRecordMapper;

    @Value("${file.compile.root}")
    private String fileCompileRoot;

    private void validateProject(ProjectDto projectDto) throws BadRequestException {
        // 项目名称不能为空
        if (projectDto.getName() == null || projectDto.getName().trim().isEmpty()) {
            throw new BadRequestException("项目名称不能为空");
        }
        // 项目名称不能包含特殊字符
        if (!projectDto.getName().matches("[\\u4e00-\\u9fa5A-Za-z0-9_]+")) {
            throw new BadRequestException("项目名称只能包含中文、字母、数字和下划线");
        }
        // 项目名称不能超过30个字符
        if (projectDto.getName().length() > 30) {
            throw new BadRequestException("项目名称不能超过30个字符");
        }
    }

    @Transactional
    public ProjectEntity createProject(ProjectDto projectDto) throws BadRequestException {
        validateProject(projectDto);
        // 检查项目名称是否已存在
        if (checkProjectNameExists(projectDto.getName(), null)) {
            throw new BadRequestException("项目名称已存在");
        }

        ProjectEntity project = new ProjectEntity();
        BeanUtils.copyProperties(projectDto, project);
        projectMapper.insert(project);
        return project;
    }

    @Transactional
    public void updateProject(ProjectDto projectDto) throws BadRequestException {
        // 抽取公共校验方法，和createProject方法一样
        validateProject(projectDto);
        // 检查项目名称是否已存在
        if (checkProjectNameExists(projectDto.getName(), projectDto.getId())) {
            throw new BadRequestException("项目名称已存在");
        }

        ProjectEntity project = new ProjectEntity();
        BeanUtils.copyProperties(projectDto, project);
        projectMapper.updateById(project);
    }

    @Transactional
    public void deleteProject(Long id) throws BadRequestException, IOException {
        // 判断id是否存在
        if (id == null) {
            throw new BadRequestException("项目id不能为空");
        }
        ProjectEntity project = projectMapper.selectById(id);
        // 判断项目是否存在
        if (project == null) {
            throw new BadRequestException("项目不存在");
        }
        // 删除项目相关的所有文件
        try {
            fileService.deleteProjectFiles(id);
        } catch (IOException e) {
            log.error("删除项目文件失败", e);
        }

        //删除项目id创建的文件夹
        try {
            fileService.deleteProjectDeleteFolder(id);
        } catch (IOException e) {
            log.error("删除项目文件失败", e);
        }

        //删除项目编译部署记录并删除相关文件
        compileDeployRecordMapper.updateDeleteFlagProjectId(id);
        fileStorageService.deleteFolderRecursively(Paths.get(fileCompileRoot + id));

        // 逻辑删除
        projectMapper.updateDeleteFlagById(id);
    }

    public ProjectVo getProject(Long id) throws BadRequestException {
        // 判断id是否存在
        if (id == null) {
            throw new BadRequestException("项目id不能为空");
        }
        ProjectEntity project = projectMapper.selectById(id);
        // 判断项目是否存在
        if (project == null) {
            throw new BadRequestException("项目不存在");
        }

        ProjectVo vo = new ProjectVo();
        BeanUtils.copyProperties(project, vo);
        return vo;
    }

    public List<ProjectVo> getProjectList() {
        List<ProjectEntity> projects = projectMapper.selectList(null);
        if (CollectionUtils.isEmpty(projects)) {
            return new ArrayList<>();
        }
        return projects.stream().map(project -> {
            ProjectVo vo = new ProjectVo();
            BeanUtils.copyProperties(project, vo);
            return vo;
        }).collect(Collectors.toList());
    }

    public boolean checkProjectNameExists(String name, Long excludeId) {
        LambdaQueryWrapper<ProjectEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ProjectEntity::getName, name);
        if (excludeId != null) {
            wrapper.ne(ProjectEntity::getId, excludeId);
        }
        return projectMapper.selectCount(wrapper) > 0;
    }
}
