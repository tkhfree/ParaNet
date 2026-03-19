package com.citc.editor.chat.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.citc.editor.chat.dto.ChatRequestDto;
import com.citc.editor.common.R;
import com.citc.editor.common.exceptions.BadRequestException;
import com.citc.editor.common.exceptions.BusinessException;
import com.citc.editor.file.dto.FileDto;
import com.citc.editor.file.dto.ProjectDto;
import com.citc.editor.file.entity.CompileDeployRecordEntity;
import com.citc.editor.file.entity.CompileLogsEntity;
import com.citc.editor.file.entity.FileEntity;
import com.citc.editor.file.entity.ProjectEntity;
import com.citc.editor.file.enums.OperationTypeEnum;
import com.citc.editor.file.mapper.CompileDeployRecordMapper;
import com.citc.editor.file.mapper.CompileLogsMapper;
import com.citc.editor.file.mapper.FileMapper;
import com.citc.editor.file.service.FileStorageService;
import com.citc.editor.file.service.FileService;
import com.citc.editor.file.service.ProjectService;
import com.citc.editor.file.service.RemoteCallService;
import com.citc.editor.file.vo.CompileDeployRecordVo;
import com.citc.editor.file.vo.FileVo;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Slf4j
@Service
@AllArgsConstructor
public class ChatToolService {
    private static final int CONTENT_MAX_LENGTH = 12000;
    private static final int TREE_MAX_LENGTH = 6000;

    private final FileService fileService;
    private final FileStorageService fileStorageService;
    private final FileMapper fileMapper;
    private final RemoteCallService remoteCallService;
    private final ProjectService projectService;
    private final CompileLogsMapper compileLogsMapper;
    private final CompileDeployRecordMapper compileDeployRecordMapper;

    public String executeTool(String toolName, Map<String, Object> arguments, ChatRequestDto requestDto) throws Exception {
        if ("create_project".equals(toolName)) {
            return createProject(arguments);
        }
        if ("update_project".equals(toolName)) {
            return updateProject(arguments, requestDto);
        }
        if ("get_project_file_tree".equals(toolName)) {
            return getProjectFileTree(resolveProjectId(arguments, requestDto));
        }
        if ("create_project_file".equals(toolName)) {
            return createProjectFile(resolveProjectId(arguments, requestDto), arguments);
        }
        if ("read_project_file".equals(toolName)) {
            return readProjectFile(resolveProjectId(arguments, requestDto), arguments, requestDto);
        }
        if ("save_project_file".equals(toolName)) {
            return saveProjectFile(resolveProjectId(arguments, requestDto), arguments, requestDto);
        }
        if ("rename_project_file".equals(toolName)) {
            return renameProjectFile(resolveProjectId(arguments, requestDto), arguments, requestDto);
        }
        if ("move_project_file".equals(toolName)) {
            return moveProjectFile(resolveProjectId(arguments, requestDto), arguments, requestDto);
        }
        if ("delete_project_file".equals(toolName)) {
            return deleteProjectFile(resolveProjectId(arguments, requestDto), arguments, requestDto);
        }
        if ("frontend_compile".equals(toolName)) {
            return frontendCompile(resolveProjectId(arguments, requestDto));
        }
        if ("deploy_project".equals(toolName)) {
            return deployProject(resolveProjectId(arguments, requestDto), readString(arguments, "deviceName"));
        }
        if ("backend_compile".equals(toolName)) {
            return backendCompile(resolveProjectId(arguments, requestDto), readString(arguments, "deviceName"));
        }
        if ("query_project_log".equals(toolName)) {
            return queryProjectLog(resolveProjectId(arguments, requestDto), arguments);
        }
        if ("get_frontend_compile_files".equals(toolName)) {
            return getFrontendCompileFiles(resolveProjectId(arguments, requestDto));
        }
        if ("read_frontend_compile_file".equals(toolName)) {
            return readFrontendCompileFile(resolveProjectId(arguments, requestDto), arguments);
        }
        if ("list_project_devices".equals(toolName)) {
            return listProjectDevices(resolveProjectId(arguments, requestDto));
        }
        throw new BusinessException("暂不支持的工具：" + toolName);
    }

    private String createProject(Map<String, Object> arguments) throws BadRequestException {
        String name = readRequiredString(arguments, "name");
        String remark = StringUtils.defaultString(readString(arguments, "remark"));

        ProjectDto dto = new ProjectDto();
        dto.setName(name.trim());
        dto.setRemark(remark.trim());

        ProjectEntity entity = projectService.createProject(dto);
        return "已成功创建项目：" + entity.getName() + "，项目ID：" + entity.getId();
    }

    private String updateProject(Map<String, Object> arguments, ChatRequestDto requestDto) throws BadRequestException {
        Long projectId = resolveProjectId(arguments, requestDto);
        String name = readRequiredString(arguments, "name");
        String remark = StringUtils.defaultString(readString(arguments, "remark"));

        ProjectDto dto = new ProjectDto();
        dto.setId(projectId);
        dto.setName(name.trim());
        dto.setRemark(remark.trim());
        projectService.updateProject(dto);
        return "已成功更新项目：" + name.trim();
    }

    public String getProjectFileTree(Long projectId) {
        List<FileVo> tree = fileService.getProjectFileTree(projectId);
        if (CollectionUtils.isEmpty(tree)) {
            return "当前项目下暂无文件。";
        }
        StringBuilder builder = new StringBuilder();
        appendTree(builder, tree, 0);
        return truncate(builder.toString().trim(), TREE_MAX_LENGTH);
    }

    public String listProjectDevices(Long projectId) throws BadRequestException, IOException {
        Map<String, String> devices = remoteCallService.getProjectDeviceMap(projectId);
        if (devices.isEmpty()) {
            return "当前项目未解析出设备信息，请先检查 path.json 文件。";
        }
        return devices.entrySet().stream()
                .map(entry -> entry.getKey() + " -> " + entry.getValue())
                .collect(Collectors.joining("\n"));
    }

    private String createProjectFile(Long projectId, Map<String, Object> arguments) throws IOException, BadRequestException {
        String fileName = readRequiredString(arguments, "fileName");
        boolean isFolder = readBoolean(arguments, "isFolder", false);
        Long parentId = resolveFolderId(projectId, arguments, "parentId", "parentFolderName");

        FileDto dto = new FileDto();
        dto.setProjectId(projectId);
        dto.setParentId(parentId);
        dto.setFileName(fileName.trim());
        dto.setIsFolder(isFolder ? 1 : 0);

        if (isFolder) {
            dto.setFileType(3);
        } else {
            Long fileType = readLong(arguments, "fileType");
            if (fileType == null) {
                throw new BadRequestException("创建文件时必须提供 fileType");
            }
            dto.setFileType(fileType.intValue());
            dto.setContent(StringUtils.defaultString(readString(arguments, "content")));
        }

        FileEntity entity = fileService.createFile(dto);
        return "已成功创建" + (isFolder ? "文件夹" : "文件") + "：" + entity.getFileName() + "，ID：" + entity.getId();
    }

    private String readProjectFile(Long projectId, Map<String, Object> arguments, ChatRequestDto requestDto) throws IOException, BadRequestException {
        FileEntity fileEntity = resolveFile(projectId, arguments, requestDto);
        String content = fileService.readFile(fileEntity.getId());
        return "文件：" + fileEntity.getFileName() + "\n\n" + truncate(content, CONTENT_MAX_LENGTH);
    }

    private String saveProjectFile(Long projectId, Map<String, Object> arguments, ChatRequestDto requestDto) throws IOException, BadRequestException {
        String content = readString(arguments, "content");
        if (StringUtils.isBlank(content)) {
            throw new BadRequestException("保存文件时 content 不能为空");
        }
        FileEntity fileEntity = resolveFile(projectId, arguments, requestDto);
        FileDto fileDto = new FileDto();
        fileDto.setFileId(fileEntity.getId());
        fileDto.setContent(content);
        fileService.updateFileContent(fileDto);
        return "已成功保存文件：" + fileEntity.getFileName();
    }

    private String renameProjectFile(Long projectId, Map<String, Object> arguments, ChatRequestDto requestDto) throws IOException, BadRequestException {
        FileEntity fileEntity = resolveFile(projectId, arguments, requestDto);
        String newName = readRequiredString(arguments, "newName");
        fileService.renameFile(fileEntity.getId(), newName.trim());
        return "已成功重命名文件：" + fileEntity.getFileName() + " -> " + newName.trim();
    }

    private String moveProjectFile(Long projectId, Map<String, Object> arguments, ChatRequestDto requestDto) throws IOException, BadRequestException {
        FileEntity fileEntity = resolveFile(projectId, arguments, requestDto);
        Long targetParentId = resolveMoveTarget(projectId, arguments);
        fileService.moveFile(fileEntity.getId(), targetParentId);
        return targetParentId == null
                ? "已成功将文件移动到项目根目录：" + fileEntity.getFileName()
                : "已成功移动文件：" + fileEntity.getFileName();
    }

    private String deleteProjectFile(Long projectId, Map<String, Object> arguments, ChatRequestDto requestDto) throws IOException, BadRequestException {
        FileEntity fileEntity = resolveFile(projectId, arguments, requestDto);
        FileDto dto = new FileDto();
        dto.setFileId(fileEntity.getId());
        fileService.deleteFile(dto);
        return "已成功删除文件或文件夹：" + fileEntity.getFileName();
    }

    private String frontendCompile(Long projectId) {
        R result = remoteCallService.frontendCompile(projectId);
        return stringifyResult("前端编译", result);
    }

    private String deployProject(Long projectId, String deviceName) throws IOException, BadRequestException {
        if (StringUtils.isBlank(deviceName)) {
            throw new BadRequestException("部署时必须提供 deviceName");
        }
        R result = remoteCallService.deploy(projectId, deviceName.trim());
        return stringifyResult("部署", result);
    }

    private String backendCompile(Long projectId, String deviceName) throws IOException, BadRequestException {
        if (StringUtils.isBlank(deviceName)) {
            throw new BadRequestException("后端编译时必须提供 deviceName");
        }
        R result = remoteCallService.backendCompile(projectId, deviceName.trim());
        return stringifyResult("后端编译", result);
    }

    private String queryProjectLog(Long projectId, Map<String, Object> arguments) throws IOException, BadRequestException {
        String logType = StringUtils.defaultIfBlank(readString(arguments, "logType"), "frontend_compile").trim();
        String deviceName = readString(arguments, "deviceName");
        String ip = readString(arguments, "ip");

        if ("frontend_compile".equals(logType)) {
            CompileLogsEntity entity = queryLatestCompileLog(projectId, OperationTypeEnum.FRONT_COMPILE.getType(), null);
            return entity == null ? "暂无前端编译日志。" : StringUtils.defaultIfBlank(entity.getCompileOut(), "暂无前端编译日志内容。");
        }

        if ("backend_compile".equals(logType)) {
            String resolvedIp = resolveDeviceIp(projectId, deviceName, ip);
            CompileLogsEntity entity = queryLatestCompileLog(projectId, OperationTypeEnum.BACKEND_COMPILE.getType(), resolvedIp);
            return entity == null ? "暂无后端编译日志。" : StringUtils.defaultIfBlank(entity.getCompileOut(), "暂无后端编译日志内容。");
        }

        if ("deploy".equals(logType)) {
            String resolvedIp = resolveDeviceIp(projectId, deviceName, ip);
            CompileDeployRecordEntity entity = queryLatestDeployRecord(projectId, resolvedIp);
            return entity == null ? "暂无部署日志。"
                    : StringUtils.defaultIfBlank(entity.getResponseResult(), "暂无部署日志内容。");
        }

        throw new BadRequestException("logType 只支持 frontend_compile、deploy、backend_compile");
    }

    private String getFrontendCompileFiles(Long projectId) {
        List<CompileDeployRecordVo> records = compileDeployRecordMapper.getFrontendCompileFiles(projectId);
        if (CollectionUtils.isEmpty(records)) {
            return "当前项目暂无前端编译产物。";
        }
        return records.stream()
                .map(record -> String.format(
                        "ID=%s, 文件=%s, IP=%s, 类型=%s, 时间=%s",
                        record.getId(),
                        record.getFileName(),
                        record.getOperationIp(),
                        record.getFileType(),
                        record.getCreateAt()
                ))
                .collect(Collectors.joining("\n"));
    }

    private String readFrontendCompileFile(Long projectId, Map<String, Object> arguments) throws IOException, BadRequestException {
        Long recordId = readLong(arguments, "recordId");
        if (recordId == null) {
            throw new BadRequestException("读取前端编译产物时必须提供 recordId");
        }
        CompileDeployRecordEntity entity = compileDeployRecordMapper.selectById(recordId);
        if (entity == null || !Objects.equals(entity.getProjectId(), projectId)) {
            throw new BadRequestException("未找到对应的前端编译产物记录");
        }
        if (StringUtils.isBlank(entity.getFilePath())) {
            throw new BadRequestException("该编译产物没有文件路径");
        }
        String content = fileStorageService.readFile(entity.getFilePath());
        return "前端编译产物：" + entity.getFileName() + "\n\n" + truncate(content, CONTENT_MAX_LENGTH);
    }

    private CompileLogsEntity queryLatestCompileLog(Long projectId, Integer operationType, String ip) {
        LambdaQueryWrapper<CompileLogsEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(CompileLogsEntity::getProjectId, projectId)
                .eq(CompileLogsEntity::getOperationType, operationType)
                .orderByDesc(CompileLogsEntity::getCreateAt)
                .last("limit 1");
        if (StringUtils.isNotBlank(ip)) {
            wrapper.eq(CompileLogsEntity::getOperationIp, ip);
        }
        return compileLogsMapper.selectOne(wrapper);
    }

    private CompileDeployRecordEntity queryLatestDeployRecord(Long projectId, String ip) {
        LambdaQueryWrapper<CompileDeployRecordEntity> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(CompileDeployRecordEntity::getProjectId, projectId)
                .eq(CompileDeployRecordEntity::getOperationType, OperationTypeEnum.DEPLOY.getType())
                .orderByDesc(CompileDeployRecordEntity::getCreateAt)
                .last("limit 1");
        if (StringUtils.isNotBlank(ip)) {
            wrapper.eq(CompileDeployRecordEntity::getOperationIp, ip);
        }
        return compileDeployRecordMapper.selectOne(wrapper);
    }

    private FileEntity resolveFile(Long projectId, Map<String, Object> arguments, ChatRequestDto requestDto) throws BadRequestException {
        Long fileId = readLong(arguments, "fileId");
        if (fileId == null) {
            fileId = requestDto.getCurrentFileId();
        }
        if (fileId != null) {
            FileEntity fileEntity = fileMapper.findById(fileId);
            if (fileEntity == null) {
                throw new BadRequestException("未找到对应文件，fileId=" + fileId);
            }
            if (!Objects.equals(fileEntity.getProjectId(), projectId)) {
                throw new BadRequestException("该文件不属于当前项目，fileId=" + fileId);
            }
            return fileEntity;
        }

        String fileName = StringUtils.defaultIfBlank(readString(arguments, "fileName"), requestDto.getCurrentFileName());
        if (StringUtils.isBlank(fileName)) {
            throw new BadRequestException("请提供 fileId 或 fileName");
        }

        List<FileEntity> projectFiles = fileMapper.findByProjectId(projectId);
        List<FileEntity> candidates = projectFiles.stream()
                .filter(item -> item.getIsFolder() != null && item.getIsFolder() == 0)
                .filter(item -> fileName.trim().equalsIgnoreCase(item.getFileName()))
                .collect(Collectors.toList());

        if (candidates.isEmpty()) {
            candidates = projectFiles.stream()
                    .filter(item -> item.getIsFolder() != null && item.getIsFolder() == 0)
                    .filter(item -> item.getFileName() != null && item.getFileName().toLowerCase().contains(fileName.trim().toLowerCase()))
                    .collect(Collectors.toList());
        }

        if (candidates.isEmpty()) {
            throw new BadRequestException("项目中未找到文件：" + fileName);
        }
        if (candidates.size() > 1) {
            String names = candidates.stream().map(FileEntity::getFileName).collect(Collectors.joining(", "));
            throw new BadRequestException("匹配到多个文件，请提供更准确的文件名：" + names);
        }
        return candidates.get(0);
    }

    private Long resolveProjectId(Map<String, Object> arguments, ChatRequestDto requestDto) throws BadRequestException {
        Long projectId = readLong(arguments, "projectId");
        if (projectId == null) {
            projectId = requestDto.getProjectId();
        }
        if (projectId == null) {
            throw new BadRequestException("当前未选中项目，请先选择项目");
        }
        return projectId;
    }

    private Long resolveFolderId(Long projectId, Map<String, Object> arguments, String idKey, String nameKey) throws BadRequestException {
        Long folderId = readLong(arguments, idKey);
        if (folderId != null) {
            FileEntity folder = fileMapper.findById(folderId);
            if (folder == null) {
                throw new BadRequestException("未找到目标文件夹，id=" + folderId);
            }
            if (!Objects.equals(folder.getProjectId(), projectId)) {
                throw new BadRequestException("目标文件夹不属于当前项目，id=" + folderId);
            }
            if (folder.getIsFolder() == null || folder.getIsFolder() != 1) {
                throw new BadRequestException("目标不是文件夹，id=" + folderId);
            }
            return folderId;
        }

        String folderName = readString(arguments, nameKey);
        if (StringUtils.isBlank(folderName)) {
            return null;
        }

        List<FileEntity> folders = fileMapper.findByProjectId(projectId).stream()
                .filter(item -> item.getIsFolder() != null && item.getIsFolder() == 1)
                .filter(item -> item.getFileName() != null && item.getFileName().equalsIgnoreCase(folderName.trim()))
                .collect(Collectors.toList());
        if (folders.isEmpty()) {
            throw new BadRequestException("项目中未找到文件夹：" + folderName);
        }
        if (folders.size() > 1) {
            throw new BadRequestException("匹配到多个同名文件夹，请改用 parentId 指定");
        }
        return folders.get(0).getId();
    }

    private Long resolveMoveTarget(Long projectId, Map<String, Object> arguments) throws BadRequestException {
        boolean moveToRoot = readBoolean(arguments, "moveToRoot", false);
        if (moveToRoot) {
            return null;
        }
        return resolveFolderId(projectId, arguments, "targetParentId", "targetParentName");
    }

    private String resolveDeviceIp(Long projectId, String deviceName, String ip) throws IOException, BadRequestException {
        if (StringUtils.isNotBlank(ip)) {
            return ip.trim();
        }
        if (StringUtils.isBlank(deviceName)) {
            throw new BadRequestException("请提供 deviceName 或 ip");
        }
        Map<String, String> deviceMap = remoteCallService.getProjectDeviceMap(projectId);
        String resolvedIp = deviceMap.get(deviceName.trim());
        if (StringUtils.isBlank(resolvedIp)) {
            throw new BadRequestException("未找到设备对应的 IP：" + deviceName);
        }
        return resolvedIp;
    }

    private String stringifyResult(String actionName, R result) {
        if (result == null) {
            return actionName + "失败：接口未返回内容";
        }
        if (!Objects.equals(result.getCode(), 0)) {
            return actionName + "失败：" + result.getMsg();
        }
        return actionName + "结果：\n" + Objects.toString(result.getData(), "");
    }

    private void appendTree(StringBuilder builder, List<FileVo> nodes, int depth) {
        for (FileVo node : nodes) {
            builder.append(repeat("  ", depth))
                    .append(node.getIsFolder() != null && node.getIsFolder() == 1 ? "[DIR] " : "- ")
                    .append(node.getFileName())
                    .append('\n');
            if (CollectionUtils.isNotEmpty(node.getChildren())) {
                appendTree(builder, node.getChildren(), depth + 1);
            }
        }
    }

    private String repeat(String value, int times) {
        StringBuilder builder = new StringBuilder();
        for (int i = 0; i < times; i++) {
            builder.append(value);
        }
        return builder.toString();
    }

    private String truncate(String content, int maxLength) {
        if (StringUtils.isBlank(content)) {
            return "";
        }
        if (content.length() <= maxLength) {
            return content;
        }
        return content.substring(0, maxLength) + "\n...(内容过长，已截断)";
    }

    private Long readLong(Map<String, Object> arguments, String key) {
        Object value = arguments.get(key);
        if (value == null) {
            return null;
        }
        if (value instanceof Number) {
            return ((Number) value).longValue();
        }
        String text = String.valueOf(value).trim();
        if (StringUtils.isBlank(text)) {
            return null;
        }
        try {
            return Long.parseLong(text);
        } catch (NumberFormatException exception) {
            throw new BusinessException("参数 " + key + " 不是合法数字");
        }
    }

    private String readString(Map<String, Object> arguments, String key) {
        Object value = arguments.get(key);
        return value == null ? null : String.valueOf(value);
    }

    private boolean readBoolean(Map<String, Object> arguments, String key, boolean defaultValue) {
        Object value = arguments.get(key);
        if (value == null) {
            return defaultValue;
        }
        if (value instanceof Boolean) {
            return (Boolean) value;
        }
        return Boolean.parseBoolean(String.valueOf(value));
    }

    private String readRequiredString(Map<String, Object> arguments, String key) throws BadRequestException {
        String value = readString(arguments, key);
        if (StringUtils.isBlank(value)) {
            throw new BadRequestException("参数 " + key + " 不能为空");
        }
        return value;
    }
}
