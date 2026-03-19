package com.citc.editor.file.controller;

import java.io.*;
import java.util.List;

import com.citc.editor.common.R;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.citc.editor.common.exceptions.BadRequestException;
import com.citc.editor.file.dto.FileDto;
import com.citc.editor.file.service.FileService;

import lombok.AllArgsConstructor;

import javax.servlet.http.HttpServletResponse;


/**
 * 文件管理：增删改查、重命名、移动、修改文件类型、导出ZIP、导入ZIP
 */
@AllArgsConstructor
@RestController
@RequestMapping("/file")
public class FileController {
    @Autowired
    private FileService fileService;

    /**
     * 创建文件/文件夹
     * @param fileDto 文件传输对象
     * @return 文件实体
     * @throws IOException 文件操作异常
     */
    @PostMapping("/createFile")
    public R createFile(@RequestBody FileDto fileDto) throws IOException, BadRequestException {
        return R.ok(fileService.createFile(fileDto));
    }

    /**
     * 读取文件内容
     * @param fileId 文件id
     * @return 文件内容
     * @throws IOException 文件操作异常
     */
    @GetMapping("/readFile/{fileId}")
    public R readFile(@PathVariable Long fileId) throws IOException, BadRequestException {
        return R.ok(fileService.readFile(fileId));
    }

    /**
     * 更新文件内容
     * @param fileDto 文件传输对象
     * @throws IOException 文件操作异常
     */
    @PostMapping("/updateFileContent")
    public R updateFileContent(@RequestBody FileDto fileDto) throws IOException, BadRequestException {
        fileService.updateFileContent(fileDto);
        return R.ok();
    }

    /**
     * 删除文件/文件夹
     * @param fileDto 文件传输对象
     * @throws IOException 文件操作异常
     */
    @PostMapping("/delete")
    public R deleteFile(@RequestBody FileDto fileDto) throws IOException, BadRequestException {
        fileService.deleteFile(fileDto);
        return R.ok();
    }

    /**
     * 获取项目文件
     * @param projectId 项目id
     * @return 项目文件列表
     */
    @GetMapping("/projectFileList/{projectId}")
    public R getProjectFiles(@PathVariable Long projectId) {
        return R.ok(fileService.getProjectFiles(projectId));
    }

    /**
     * 获取项目文件树
     * @param projectId 项目id
     * @return 项目文件树
     */
    @GetMapping("/tree/{projectId}")
    public R getProjectFileTree(@PathVariable Long projectId) {
        return R.ok(fileService.getProjectFileTree(projectId));
    }

    /**
     * 重命名文件或文件夹
     * @param fileDto 文件传输对象
     * @throws IOException 文件操作异常
     */
    @PostMapping("/renameFile")
    public R renameFile(@RequestBody FileDto fileDto) throws IOException, BadRequestException {
        fileService.renameFile(fileDto.getFileId(), fileDto.getFileName());
        return R.ok();
    }

    /**
     * 移动文件或文件夹
     * @param fileDto 文件传输对象
     * @throws IOException 文件操作异常
     */
    @PostMapping("/moveFile")
    public R moveFile(@RequestBody FileDto fileDto) throws IOException, BadRequestException {
        fileService.moveFile(fileDto.getFileId(), fileDto.getParentId());
        return R.ok();
    }

    /**
     * 修改文件类型
     * @param fileDto 文件传输对象
     * @throws BadRequestException 请求异常
     */
    @PostMapping("/updateFileType")
    public R updateFileType(@RequestBody FileDto fileDto) throws IOException, BadRequestException {
        fileService.updateFileType(fileDto.getFileId(), fileDto.getFileType());
        return R.ok();
    }

    /**
     * 导出 ZIP
     * @param projectId 项目id
     * @param fileIds 文件id
     * @return 文件内容
     * @throws IOException 文件操作异常
     */
    @GetMapping("/export")
    public void exportFiles(@RequestParam Long projectId, @RequestParam(required = false) List<Long> fileIds, HttpServletResponse response) throws IOException, BadRequestException {
        File zipFile = fileService.exportFiles(projectId, fileIds);

        // 2. 设置响应头
        response.setContentType("application/octet-stream");
        response.setContentLength((int) zipFile.length());

        // 设置下载文件名（可选，否则使用原始文件名）
        String headerKey = "Content-Disposition";
        String headerValue = String.format("attachment; filename=\"%s\"", zipFile.getName());
        response.setHeader(headerKey, headerValue);
        // 3. 获取输出流并写入文件内容
        try (FileInputStream inStream = new FileInputStream(zipFile);
             OutputStream outStream = response.getOutputStream()) {

            byte[] buffer = new byte[4096];
            int bytesRead;

            while ((bytesRead = inStream.read(buffer)) != -1) {
                outStream.write(buffer, 0, bytesRead);
            }
        }catch (Exception e){
            throw new BadRequestException("文件导出失败");
        }

        //删除压缩包
        zipFile.delete();
    }

    /**
     * 导入 ZIP
     * @param projectId 项目id
     * @param parentId 父文件id
     * @param file 文件
     * @throws IOException 文件操作异常
     */
    @PostMapping("/import")
    public R importZip(@RequestParam Long projectId, @RequestParam(required = false) Long parentId, @RequestParam MultipartFile file) throws IOException {
        fileService.importZip(projectId, parentId, file);
        return R.ok();
    }

    /**
     * 获取项目拓扑文件内容
     * @param projectId
     * @return
     * @throws IOException
     */
    @PostMapping("/getJsonContentByProjectId")
    public R getJsonContentByProjectId(@RequestParam Long projectId) throws IOException {
        return fileService.getJsonContentByProjectId(projectId);
    }

}
