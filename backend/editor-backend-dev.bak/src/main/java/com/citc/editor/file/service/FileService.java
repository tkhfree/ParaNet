package com.citc.editor.file.service;

import com.citc.editor.common.R;
import com.citc.editor.common.exceptions.BadRequestException;
import com.citc.editor.common.exceptions.BusinessException;
import com.citc.editor.common.util.FileUtil;
import com.citc.editor.common.util.SnowflakeUtil;
import com.citc.editor.common.util.ZipUtil;
import com.citc.editor.file.dto.FileDto;
import com.citc.editor.file.entity.CompileDeployRecordEntity;
import com.citc.editor.file.entity.FileEntity;
import com.citc.editor.file.entity.ProjectEntity;
import com.citc.editor.file.enums.FileTypeEnum;
import com.citc.editor.file.enums.FolderFlagEnum;
import com.citc.editor.file.mapper.CompileDeployRecordMapper;
import com.citc.editor.file.mapper.FileMapper;
import com.citc.editor.file.mapper.ProjectMapper;
import com.citc.editor.file.vo.CompileDeployRecordVo;
import com.citc.editor.file.vo.FileVo;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.compress.archivers.zip.ZipArchiveEntry;
import org.apache.commons.compress.archivers.zip.ZipArchiveOutputStream;
import org.apache.commons.compress.utils.Lists;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.ObjectUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Slf4j
@Service
public class FileService {
    @Autowired
    private FileMapper fileMapper;

    @Autowired
    private FileStorageService fileStorageService;

    @Autowired
    private ProjectMapper projectMapper;

    @Value("${file.storage.root}")
    private String fileStorageRoot;

    @Value("${file.export.root}")
    private String fileExportRoot;

    @Autowired
    private CompileDeployRecordMapper compileDeployRecordMapper;

    private static final String TOPOLOGY = "topology";

    /**
     * 前端编译文件存放文件夹
     */
    private static final String FORNTEND_COMPILE_FILE_PATH = "output";

    private String frontendCompileFilePath(Long projectId) {
        return fileStorageRoot + File.separator + projectId + File.separator + FORNTEND_COMPILE_FILE_PATH;
    }

    @Autowired
    public FileService(FileMapper fileMapper, FileStorageService fileStorageService) {
        this.fileMapper = fileMapper;
        this.fileStorageService = fileStorageService;
    }

    /**
     * 验证FileDto的基本参数
     *
     * @param fileDto 文件传输对象
     * @throws BadRequestException 当必要参数缺失时
     */
    private void validateFileDto(FileDto fileDto) throws BadRequestException {
        if (fileDto == null || fileDto.getFileId() == null) {
            throw new BadRequestException("请选择文件");
        }
    }

    /**
     * 获取并验证文件实体
     *
     * @param fileId 文件ID
     * @return 文件实体
     * @throws BadRequestException 当文件不存在时
     */
    private FileEntity getAndValidateFile(Long fileId) throws BadRequestException {
        FileEntity fileEntity = fileMapper.findById(fileId);
        if (fileEntity == null) {
            throw new BadRequestException("文件不存在");
        }
        return fileEntity;
    }

    /**
     * 创建文件
     *
     * @param fileDto 文件传输对象
     * @return 文件实体
     * @throws IOException         文件操作异常
     * @throws BadRequestException 请求异常
     */
    public FileEntity createFile(FileDto fileDto) throws IOException, BadRequestException {
        // 判断projectId是否存在
        if (fileDto.getProjectId() == null) {
            throw new BadRequestException("项目id不能为空");
        }
        // 判断projectId是否存在
        if (projectMapper.selectById(fileDto.getProjectId()) == null) {
            throw new BadRequestException("项目不存在");
        }

        //判断名称不能为空
        if (fileDto.getIsFolder() == 1) {
            // 文件夹名不能为空
            if (fileDto.getFileName() == null || fileDto.getFileName().trim().isEmpty()) {
                throw new BadRequestException("文件夹名称不能为空");
            }
        } else {
            // 文件名不能为空
            if (fileDto.getFileName() == null || fileDto.getFileName().trim().isEmpty()) {
                throw new BadRequestException("文件名称不能为空");
            }
        }

        //校验一个项目只能有一个拓扑文件(json)
        if (fileDto.getIsFolder() != 1 && fileDto.getFileType() == 0 &&
                ((TOPOLOGY.equals(fileDto.getFileName()) &&
                        fileMapper.getCountByProjectIdAndFileName(fileDto.getProjectId(), fileDto.getFileName() + ".json") > 0)
                        || !TOPOLOGY.equals(fileDto.getFileName()))) {
            throw new BadRequestException("项目只能有一个拓扑文件,并且拓扑文件名称必须为 'topology'");
        }


        FileEntity fileEntity = new FileEntity();
        BeanUtils.copyProperties(fileDto, fileEntity);

        // 如果是文件夹，判断父文件夹下是否存在同名文件夹
        if (fileDto.getIsFolder() == 1) {
            // 文件夹名称合法校验
            checkFolderName(fileDto.getFileName());

            if (fileMapper.findByNameAndParentId(fileDto.getFileName(), fileDto.getParentId(), fileDto.getProjectId(),
                    fileDto.getIsFolder()) != null) {
                throw new BadRequestException("文件夹已存在");
            }
            fileEntity.setFileType(3);
            fileEntity.setFilePath("/");
        } else {
            // 文件名合法校验
            checkFileName(fileDto.getFileName());

            // 文件类型必须得传
            if (fileDto.getFileType() == null) {
                throw new BadRequestException("文件类型不能为空");
            }

            //根据文件类型获取文件后缀名
            String suffix = "";
            if (fileDto.getFileType() == 0) {
                suffix = ".json";
            } else if (fileDto.getFileType() == 1) {
                suffix = ".pne";
            } else if (fileDto.getFileType() == 2) {
                //其他类型的文件类型,需要自行判断是否有后缀名
            } else if (fileDto.getFileType() == 4) {
                suffix = ".p4";
            } else if (fileDto.getFileType() == 5) {
                suffix = ".domain";
            }
            fileEntity.setFileName(fileDto.getFileName() + suffix);

            // 文件类型必须在fileTypeEnum中
            if (FileTypeEnum.getEnumByType(fileDto.getFileType()) == null) {
                throw new BadRequestException("文件类型不正确");
            }
            // 如果是文件，判断父文件夹下是否存在同名文件
            if (fileMapper.findFileByNameAndParentId(fileEntity.getFileName(), null, fileDto.getProjectId(),
                    fileDto.getIsFolder(), fileDto.getFileType()) != null) {
                throw new BadRequestException("文件名称已存在");
            }
            String filePath = fileStorageService.saveFile(fileDto.getProjectId().toString(), fileDto.getFileName(),
                    fileDto.getContent(), fileDto.getFileType());
            fileEntity.setFilePath(filePath);
        }

        fileMapper.insert(fileEntity);
        return fileEntity;
    }

    /**
     * 读取文件
     *
     * @param fileId 文件id
     * @return 文件内容
     * @throws IOException 文件操作异常
     */
    public String readFile(Long fileId) throws IOException, BadRequestException {
        FileEntity fileEntity = getAndValidateFile(fileId);
        //判断是不是output文件夹下的文件
        Long parentId = fileEntity.getParentId();
        if (parentId != null) {
            FileEntity parentFile = fileMapper.findById(parentId);
            if (FORNTEND_COMPILE_FILE_PATH.equals(parentFile.getFileName())) {
                fileEntity.setFilePath(frontendCompileFilePath(fileEntity.getProjectId()) + fileEntity.getFilePath());
            }
        }


        return fileStorageService.readFile(fileEntity.getFilePath());
    }

    /**
     * 更新文件内容
     *
     * @param fileDto 文件传输对象
     * @throws IOException 文件操作异常
     */
    public void updateFileContent(FileDto fileDto) throws IOException, BadRequestException {
        validateFileDto(fileDto);
        FileEntity fileEntity = getAndValidateFile(fileDto.getFileId());
        //判断文件是否是output文件夹下的文件,如果是,则将文件路径改为output文件夹下的文件路径
        FileEntity output = fileMapper.findByNameAndProjectId(FORNTEND_COMPILE_FILE_PATH, fileEntity.getProjectId());
        if (!ObjectUtils.isEmpty(output) && output.getId().equals(fileEntity.getParentId())) {
            fileEntity.setFilePath(frontendCompileFilePath(fileEntity.getProjectId()) + fileEntity.getFilePath());

            //同时,还要更新最后一次编译记录的文件内容
            CompileDeployRecordEntity compileDeployRecordEntity = compileDeployRecordMapper.getOneByProjectIdAndFileName(fileEntity.getProjectId(), fileEntity.getFileName());
            if (!ObjectUtils.isEmpty(compileDeployRecordEntity)) {
                fileStorageService.updateFile(compileDeployRecordEntity.getFilePath(), fileDto.getContent());
            }
        }
        fileStorageService.updateFile(fileEntity.getFilePath(), fileDto.getContent());
    }

    /**
     * 删除文件
     *
     * @param fileDto 文件传输对象
     * @throws IOException 文件操作异常
     */
    public void deleteFile(FileDto fileDto) throws IOException, BadRequestException {
        validateFileDto(fileDto);
        FileEntity fileEntity = getAndValidateFile(fileDto.getFileId());
        deleteFileRecursively(fileEntity);
    }

    /**
     * 递归删除文件
     *
     * @param fileEntity 文件实体
     * @throws IOException 文件操作异常
     */
    private void deleteFileRecursively(FileEntity fileEntity) throws IOException {
        if (fileEntity.getIsFolder() == 1) {
            List<FileEntity> children = fileMapper.findByParentId(fileEntity.getId());
            for (FileEntity child : children) {
                deleteFileRecursively(child);
            }
            //文件夹没有创建，因此不需要删除文件夹操作
            //fileStorageService.deleteFolder(fileEntity.getFilePath());
        } else {
            fileStorageService.deleteFile(fileEntity.getFilePath());
        }
        fileMapper.deleteById(fileEntity.getId());
    }

    /**
     * 获取项目文件
     *
     * @param projectId 项目id
     * @return 文件列表
     */
    public List<FileEntity> getProjectFiles(Long projectId) {
        return fileMapper.findByProjectId(projectId);
    }

    /**
     * 递归获取项目文件树
     *
     * @param projectId 项目id
     * @return 文件树
     */
    public List<FileVo> getProjectFileTree(Long projectId) {
        List<FileEntity> allFiles = fileMapper.findByProjectId(projectId);
        if (CollectionUtils.isEmpty(allFiles)) {
            return Lists.newArrayList();
        }
        /*List<CompileDeployRecordVo> frontendCompileFiles = compileDeployRecordMapper.getFrontendCompileFiles(projectId);
        if (CollectionUtils.isEmpty(frontendCompileFiles)) {
            return buildFileTree(null, allFiles);
        }
        // 获取最新的编译文件，制定前端编译文件层级
        if (CollectionUtils.isNotEmpty(frontendCompileFiles)) {
            FileEntity outputFolder = allFiles.stream().filter(file -> "output".equals(file.getFileName())).findFirst().orElse(null);
            if (Objects.isNull(outputFolder)) {
                outputFolder = new FileEntity()
                        .setId(SnowflakeUtil.nextId())
                        .setFileName("output")
                        .setIsFolder(FolderFlagEnum.FOLDER.getCode())
                        .setFileType(FileTypeEnum.FOLDER.getType())
                        .setProjectId(projectId)
                        .setFilePath("/")
                        .setFilePath(fileStorageRoot + File.separator + projectId + "/output");
                allFiles.add(outputFolder);
            }
            for (CompileDeployRecordVo compileDeployRecordVo : frontendCompileFiles) {
                allFiles.add(new FileEntity()
                        .setId(SnowflakeUtil.nextId())
                        .setFileName(compileDeployRecordVo.getFileName())
                        .setIsFolder(FolderFlagEnum.FILE.getCode())
                        .setFileType(compileDeployRecordVo.getFileType())
                        .setProjectId(projectId)
                        .setFilePath(compileDeployRecordVo.getFilePath())
                        .setParentId(outputFolder.getId())
                );
            }
        }*/
        return buildFileTree(null, allFiles);
    }

    /**
     * 构建文件树
     *
     * @param parentId 父文件id
     * @param allFiles 所有文件
     * @return 文件树
     */
    private List<FileVo> buildFileTree(Long parentId, List<FileEntity> allFiles) {
        List<FileVo> tree = new ArrayList<>();
        for (FileEntity file : allFiles) {
            if ((parentId == null && file.getParentId() == null)
                    || (parentId != null && parentId.equals(file.getParentId()))) {
                FileVo fileVo = new FileVo();
                BeanUtils.copyProperties(file, fileVo);
                fileVo.setChildren(buildFileTree(file.getId(), allFiles));
                tree.add(fileVo);
            }
        }
        return tree;
    }

    /**
     * 重命名文件或文件夹
     *
     * @param fileId  文件id
     * @param newName 新名称
     * @throws IOException         文件操作异常
     * @throws BadRequestException 请求异常
     */
    public void renameFile(Long fileId, String newName) throws IOException, BadRequestException {
        // 和createFile方法一样，校验newName
        if (newName == null || newName.trim().isEmpty()) {
            throw new BadRequestException("请输入新名称");
        }

        FileEntity fileEntity = getAndValidateFile(fileId);

        // 和createFile方法一样，校验newName合法性（区分文件夹和文件）
        if (fileEntity.getIsFolder() == 1) {
            checkFolderName(newName);
        } else {
            checkFileName(newName);
        }

        //校验同文件夹下是否存在同名文件，排除当前文件 (区分文件夹和文件-文件查询加后缀)
        if (fileEntity.getIsFolder() == 1) {
            FileEntity existingFile = fileMapper.findByNameAndParentId(newName, fileEntity.getParentId(),
                    fileEntity.getProjectId(), fileEntity.getIsFolder());
            if (existingFile != null && !existingFile.getId().equals(fileId)) {
                throw new BadRequestException("已存在同名文件夹");
            }
        } else {
            //根据文件类型获取文件后缀名
            String suffix = "";
            if (fileEntity.getFileType() == 0) {
                suffix = ".json";
            } else if (fileEntity.getFileType() == 1) {
                suffix = ".pne";
            } else if (fileEntity.getFileType() == 2) {
                //其他类型的文件类型,需要自行根据原来的后缀名自动加上后缀名
                int dotIndex = fileEntity.getFileName().lastIndexOf(".");
                if (dotIndex > 0) {
                    suffix = "." + fileEntity.getFileName().substring(dotIndex + 1);
                }
            } else if (fileEntity.getFileType() == 4) {
                suffix = ".p4";
            } else if (fileEntity.getFileType() == 5) {
                suffix = ".domain";
            }
            newName += suffix;
            FileEntity existingFile = fileMapper.findFileByNameAndParentId(newName, fileEntity.getParentId(),
                    fileEntity.getProjectId(), fileEntity.getIsFolder(), fileEntity.getFileType());
            if (existingFile != null && !existingFile.getId().equals(fileId)) {
                throw new BadRequestException("已存在同名文件");
            }
        }

        //只有文件需要更新路径
        if (fileEntity.getIsFolder() == 0) {
            String newFilePath = fileEntity.getFilePath().replace(fileEntity.getFileName(), newName);
            Files.move(Paths.get(fileEntity.getFilePath()), Paths.get(newFilePath));
            fileEntity.setFilePath(newFilePath);
        }
        fileEntity.setFileName(newName);
        fileMapper.update(fileEntity);
    }

    /**
     * 移动文件或文件夹
     *
     * @param fileId      文件id
     * @param newParentId 新父文件id
     * @throws IOException         文件操作异常
     * @throws BadRequestException 请求异常
     */
    public void moveFile(Long fileId, Long newParentId) throws IOException, BadRequestException {
        // fileId不能为空
        if (fileId == null) {
            throw new BadRequestException("文件id不能为空");
        }
        // fileId不能为空
        if (fileMapper.findById(fileId) == null) {
            throw new BadRequestException("文件不存在");
        }
        // fileId和newParentId不能相同
        if (fileId.equals(newParentId)) {
            throw new BadRequestException("文件id和新父文件id不能相同");
        }
        // newParentId可能为空，为空则移动到根目录

        // 如果newParentId和fileId的父文件夹是不同，需要判断newParentId下是否存在同名文件，存在则不能移动
        FileEntity fileEntity = getAndValidateFile(fileId);
        // 如果fileEntity的parentId和newParentId相同，则不能移动
        if (Objects.equals(fileEntity.getParentId(), newParentId)) {
//        if (fileEntity.getParentId().equals(newParentId)) {
            return;
        }
        // 如果newParentId不为空，则需要判断newParentId是否存在
        if (newParentId != null) {
            FileEntity newParent = getAndValidateFile(newParentId);
            if (ObjectUtils.isEmpty(newParent)) {
                throw new BadRequestException("新父文件不存在");
            }
        }
        // 需要判断newParentId下是否存在同名文件，存在则不能移动 (区分文件夹和文件-文件查询加后缀名)
        if (fileEntity.getIsFolder() == 1) {
            if (fileMapper.findByNameAndParentId(fileEntity.getFileName(), newParentId, fileEntity.getProjectId(),
                    fileEntity.getIsFolder()) != null) {
                throw new BadRequestException("目标文件夹下已存在同名文件夹");
            }
        } else {
            FileEntity fileByNameAndParentId = fileMapper.findFileByNameAndParentId(fileEntity.getFileName(), newParentId, fileEntity.getProjectId(),
                    fileEntity.getIsFolder(), fileEntity.getFileType());
            if (fileByNameAndParentId != null && !fileId.equals(fileByNameAndParentId.getId())) {
                throw new BadRequestException("目标文件夹下已存在同名文件");
            }
        }

        fileEntity.setParentId(newParentId);
        fileMapper.update(fileEntity);
    }

    /**
     * 编辑文件类型
     *
     * @param fileId   文件id
     * @param fileType 文件类型
     * @throws BadRequestException 请求异常
     */
    public void updateFileType(Long fileId, int fileType) throws IOException, BadRequestException {
        // 文件id不能为空，文件类型不能为空，文件类型必须在fileTypeEnum中
        if (ObjectUtils.isEmpty(fileId)) {
            throw new BadRequestException("文件id不能为空");
        }
        if (ObjectUtils.isEmpty(fileType) || ObjectUtils.isEmpty(FileTypeEnum.getEnumByType(fileType))) {
            throw new BadRequestException("文件类型不正确");
        }
        FileEntity fileMetadata = fileMapper.findById(fileId);
        if (ObjectUtils.isEmpty(fileMetadata)) {
            throw new BadRequestException("文件不存在");
        }
        //如果类型一致，不修改
        if (fileMetadata.getFileType().equals(fileType)) {
            return;
        }

        //校验一个项目只能有一个拓扑文件(json)
        if (fileType == 0 && fileMapper.getCountByProjectIdAndFileType(fileMetadata.getProjectId(), 0) > 0) {
            throw new BadRequestException("项目只能有一个拓扑文件,并且拓扑文件名称必须为 'topology'");
        }


        //根据原来的文件类型获取文件后缀名
        String suffix = "";
        if (fileMetadata.getFileType() == 0) {
            suffix = ".json";
        } else if (fileMetadata.getFileType() == 1) {
            suffix = ".pne";
        } else if (fileMetadata.getFileType() == 2) {
            //其他类型的文件类型,需要自行判断是否有后缀名
        } else if (fileMetadata.getFileType() == 4) {
            suffix = ".p4";
        } else if (fileMetadata.getFileType() == 5) {
            suffix = ".domain";
        }

        //根据新的文件类型获取文件后缀名
        String newSuffix = "";
        if (fileType == 0) {
            newSuffix = ".json";
        } else if (fileType == 1) {
            newSuffix = ".pne";
        } else if (fileType == 2) {
            //其他类型的文件类型,需要自行判断是否有后缀名
        } else if (fileType == 4) {
            newSuffix = ".p4";
        } else if (fileType == 5) {
            newSuffix = ".domain";
        }

        //新的文件名称
        String newFileName = "";
        int lastDotIndexFileName = fileMetadata.getFileName().lastIndexOf('.');
        if (lastDotIndexFileName >= 0) {
            String beforeDot = fileMetadata.getFileName().substring(0, lastDotIndexFileName);
            newFileName = beforeDot + newSuffix;
        } else {
            newFileName = fileMetadata.getFileName() + newSuffix;
        }

        //查询修改后的文件是否已存在，存在则不能修改类型
        if (fileMapper.findFileByNameAndParentId(newFileName, null, fileMetadata.getProjectId(),
                fileMetadata.getIsFolder(), fileType) != null) {
            throw new BadRequestException("项目中已存在同类型同名称文件，不可修改类型");
        }

        //修改文件
        String newFilePath = "";
        if ("".equals(suffix)) {
            int lastDotIndex = fileMetadata.getFilePath().lastIndexOf('.');
            if (lastDotIndex >= 0) {
                String beforeDot = fileMetadata.getFilePath().substring(0, lastDotIndex);
                newFilePath = beforeDot + newSuffix;
            } else {
                newFilePath = fileMetadata.getFilePath() + newSuffix;
            }
        } else {
            newFilePath = fileMetadata.getFilePath().replace(suffix, newSuffix);
        }
        Files.move(Paths.get(fileMetadata.getFilePath()), Paths.get(newFilePath));
        //修改文件路径
        fileMetadata.setFilePath(newFilePath);
        //修改文件名称
        fileMetadata.setFileName(newFileName);

        fileMetadata.setFileType(fileType);
        fileMapper.update(fileMetadata);
    }

    /**
     * 递归添加文件到 ZIP
     *
     * @param fileMetadata     文件
     * @param basePath 基础路径
     * @param zipOut   压缩输出流
     * @throws IOException 文件操作异常
     */
/*    private void zipFiles(File file, String basePath, ZipArchiveOutputStream zipOut) throws IOException {
        String entryName = file.getAbsolutePath().substring(basePath.length()).replace("\\", "/");
        ZipArchiveEntry zipEntry = new ZipArchiveEntry(entryName);
        zipOut.putArchiveEntry(zipEntry);

        if (file.isFile()) {
            try (InputStream input = new FileInputStream(file)) {
                IOUtils.copy(input, zipOut);
            }
        }
        zipOut.closeArchiveEntry();

        if (file.isDirectory()) {
            for (File child : Objects.requireNonNull(file.listFiles())) {
                zipFiles(child, basePath, zipOut);
            }
        }
    }*/
    private void zipFiles(FileEntity fileMetadata, String basePath, String exportPath, ZipArchiveOutputStream zipOut) throws IOException {

        //判断是文件还是文件夹
        if (fileMetadata.getIsFolder() == 1) {//文件夹

            // 创建一个 ZIP 条目来表示这个文件夹
            ZipArchiveEntry entryFolder = new ZipArchiveEntry(fileMetadata.getFileName() + "/");
            zipOut.putArchiveEntry(entryFolder);
            zipOut.closeArchiveEntry();

            //获取该文件夹下的所有文件
            List<FileEntity> allFiles = fileMapper.findByParentId(fileMetadata.getId());
            if (!ObjectUtils.isEmpty(allFiles)) {
                for (FileEntity fileEntity : allFiles) {
                    //判断是不是output文件夹下的文件
                    Long parentId = fileEntity.getParentId();
                    if (parentId != null) {
                        FileEntity parentFile = fileMapper.findById(parentId);
                        if (FORNTEND_COMPILE_FILE_PATH.equals(parentFile.getFileName())) {
                            fileEntity.setFilePath(frontendCompileFilePath(fileEntity.getProjectId()) + fileEntity.getFilePath());
                        }
                    }

                    fileEntity.setFileName(fileMetadata.getFileName() + "/" + fileEntity.getFileName());
                    zipFiles(fileEntity, basePath, exportPath + "/" + fileMetadata.getFileName(), zipOut);
                }
            }
        } else {//文件
            //判断是不是output文件夹下的文件
            Long parentId = fileMetadata.getParentId();
            if (parentId != null) {
                FileEntity parentFile = fileMapper.findById(parentId);
                if (FORNTEND_COMPILE_FILE_PATH.equals(parentFile.getFileName())) {
                    fileMetadata.setFilePath(frontendCompileFilePath(fileMetadata.getProjectId()) + fileMetadata.getFilePath());
                }
            }
            File file = new File(fileMetadata != null ? fileMetadata.getFilePath() : basePath);
            try (InputStream input = new FileInputStream(file)) {
                // 创建一个新的 ZIP 文件条目
                ZipArchiveEntry entry = new ZipArchiveEntry(fileMetadata.getFileName());
                zipOut.putArchiveEntry(entry);

                // 将文件内容写入到 ZIP 条目中
                byte[] buffer = new byte[1024];
                int bytesRead;
                while ((bytesRead = input.read(buffer)) != -1) {
                    zipOut.write(buffer, 0, bytesRead);
                }
            }
            zipOut.closeArchiveEntry();
        }
    }

    /**
     * 导出 ZIP
     *
     * @param projectId 项目id
     * @param fileIds    文件id
     * @return 文件
     * @throws IOException 文件操作异常
     */
    /*public File exportFiles(Long projectId, Long fileId) throws IOException {
        FileEntity fileMetadata = (fileId != null) ? fileMapper.findById(fileId) : null;
        String basePath = fileStorageRoot + projectId;
        String exportPath = fileExportRoot + "export_" + System.currentTimeMillis() + ".zip";
        Files.createDirectories(Paths.get(fileExportRoot));
        try (ZipArchiveOutputStream zipOut = new ZipArchiveOutputStream(new FileOutputStream(exportPath))) {
            File targetFile = new File(fileMetadata != null ? fileMetadata.getFilePath() : basePath);
            zipFiles(targetFile, basePath, zipOut);
        }

        return new File(exportPath);
    }*/

    //获取所选文件的压缩包
    public File exportFiles(Long projectId, List<Long> fileIds) throws IOException, BadRequestException {

        //如果不选文件，则导出整个项目
        if (ObjectUtils.isEmpty(fileIds)) {
            fileIds = fileMapper.selectFileIdsByProjectId(projectId);
        } /*else {
            //不为空,里面只会有文件,前端只传文件的id
            //需要把文件的父id都找出来
            List<Long> parentIds = new ArrayList<>();
            for (Long fileId : fileIds) {
                getParentIdsById(fileId, parentIds);
            }
            parentIds = parentIds.stream().distinct().collect(Collectors.toList());
            fileIds.addAll(parentIds);
            fileIds = fileIds.stream().distinct().collect(Collectors.toList());
        }*/

        String basePath = fileStorageRoot + projectId;
        String exportPath = fileExportRoot + "export_" + System.currentTimeMillis() + ".zip";
        // 导出目录如果不存在就创建
        Files.createDirectories(Paths.get(fileExportRoot));

        //导出方法
        try (ZipArchiveOutputStream zipOut = new ZipArchiveOutputStream(new FileOutputStream(exportPath))) {
            // 设置压缩级别，0 - 不压缩，9 - 最大压缩
            zipOut.setLevel(9);

            //遍历选中的文件、文件夹
            for (Long fileId : fileIds) {
                FileEntity fileMetadata = fileMapper.findById(fileId);
                if (ObjectUtils.isEmpty(fileMetadata)) {
                    throw new BadRequestException("文件不存在");
                }
                zipFiles(fileMetadata, basePath, exportPath, zipOut);
            }

            // 确保所有内容写入 ZIP 文件并关闭流
            zipOut.finish();
        }
        return new File(exportPath);
    }

    public List<Long> getParentIdsById(Long fileId, List<Long> parentIds) {
        FileEntity fileMetadata = fileMapper.findById(fileId);
        if (!ObjectUtils.isEmpty(fileMetadata) && !ObjectUtils.isEmpty(fileMetadata.getParentId())) {
            parentIds.add(fileMetadata.getParentId());
            FileEntity parentFileMetadata = fileMapper.findById(fileMetadata.getParentId());
            if (!ObjectUtils.isEmpty(parentFileMetadata) && !ObjectUtils.isEmpty(parentFileMetadata.getParentId())) {
                getParentIdsById(parentFileMetadata.getId(), parentIds);
            }
        }
        return parentIds;
    }

    /**
     * 导入 ZIP
     *
     * @param projectId 项目id
     * @param parentId  父文件id
     * @param zipFile   文件
     * @throws IOException 文件操作异常
     */
    @Transactional(rollbackFor = Exception.class)
    public void importZip(Long projectId, Long parentId, MultipartFile zipFile) throws IOException {
        File tempZip = File.createTempFile("upload_", ".zip");
        zipFile.transferTo(tempZip);
        String extractPath = fileStorageRoot + projectId + "/";
        Files.createDirectories(Paths.get(extractPath));
        AtomicInteger jsonCount = new AtomicInteger(0);
        //判断项目中是否有拓扑json文件
        int jsonCountProject = fileMapper.getCountByProjectIdAndFileType(projectId, 0);
        if (jsonCountProject > 0) {
            jsonCount.incrementAndGet();
        }

        try (ZipInputStream zis = new ZipInputStream(Files.newInputStream(tempZip.toPath()), StandardCharsets.UTF_8)) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                // 跳过 macOS 系统特有的文件
                if (entry.getName().startsWith("._") || entry.getName().contains(".DS_Store") ||
                        entry.getName().contains("__MACOSX") || entry.getName().contains(".DS_Store")) {
                    continue;  // 跳过不需要的文件
                }
                File outFile = new File(extractPath + entry.getName());
                if (entry.isDirectory()) {//如果是文件夹
                    //存入表中
                    FileEntity fileFolder = new FileEntity();
                    fileFolder.setIsFolder(1);
                    fileFolder.setFileType(3);
                    fileFolder.setProjectId(projectId);
                    fileFolder.setFilePath("/");

                    //查看此项目此文件夹下是否存在同名文件夹--存在则合并
                    String[] pathArr = entry.getName().split("/");
                    Long parentIdTemp = parentId;
                    if (pathArr.length > 1) {//长度大于1,则需要获取
                        for (int i = 0; i < pathArr.length - 1; i++) {
                            FileEntity parentEntry = fileMapper.findByNameAndParentId(pathArr[i], parentIdTemp, projectId, 1);
                            if (!ObjectUtils.isEmpty(parentEntry)) {
                                parentIdTemp = parentEntry.getId();
                            }
                        }
                    }

                    if (fileMapper.findByNameAndParentId(outFile.getName(), parentIdTemp, projectId, 1) != null) {
                        continue;
                    } else {
                        fileFolder.setFileName(outFile.getName());
                    }

                    //父id根据 entry.getName()  来判断
                    if (pathArr.length > 1) {//长度>1说明是压缩包中文件夹中的文件夹
                        //根据父名称获取父id
                        FileEntity parentEntry = fileMapper.findByNameAndProjectIdNewTime(pathArr[pathArr.length - 2], projectId);
                        if (!ObjectUtils.isEmpty(parentEntry)) {
                            fileFolder.setParentId(parentEntry.getId());
                        }
                    } else {
                        fileFolder.setParentId(parentId);
                    }
                    fileMapper.insert(fileFolder);

                } else {//如果是文件
                    FileEntity fileMeta = new FileEntity();
                    fileMeta.setIsFolder(0);
                    fileMeta.setProjectId(projectId);

                    //获取后缀名
                    String suffix = "";
                    int lastDotIndex = outFile.getName().lastIndexOf('.');
                    if (lastDotIndex >= 0) {
                        suffix = outFile.getName().substring(lastDotIndex + 1);
                    }
                    //文件类型，0-拓扑，1-pne，2-其他，3-文件夹, 4-p4, 5-domain
                    if ("json".equals(suffix)) {
                        if ("topology.json".equals(outFile.getName())) {
                            fileMeta.setFileType(0);
                            jsonCount.incrementAndGet();//数量+1
                        } else {
                            fileMeta.setFileType(2);
                        }
                    } else if ("pne".equals(suffix)) {
                        fileMeta.setFileType(1);
                    } else if ("p4".equals(suffix)) {
                        fileMeta.setFileType(4);
                    } else if ("domain".equals(suffix)) {
                        fileMeta.setFileType(5);
                    } else {
                        fileMeta.setFileType(2);
                    }
                    //如果导入多个拓扑json文件，则报错
                    if (jsonCount.get() > 1) {
                        throw new BadRequestException("项目只能有一个拓扑文件,并且拓扑文件名称必须为 'topology'");
                    }

                    //查看此项目下是否存在同名文件--存在,则把文件重命名
                    if (fileMapper.findFileByNameAndParentId(outFile.getName(), null, projectId, 0, fileMeta.getFileType()) != null) {
                        String outFileName = "import_" + System.currentTimeMillis() + "_" + outFile.getName();
                        fileMeta.setFileName(outFileName);
                        fileMeta.setFilePath(extractPath + outFileName);
                    } else {
                        fileMeta.setFileName(outFile.getName());
                        fileMeta.setFilePath(extractPath + outFile.getName());
                    }

                    //父id根据 entry.getName()  来判断
                    String[] pathArr = entry.getName().split("/");
                    if (pathArr.length > 1) {//长度>1说明是压缩包中文件夹中的文件夹
                        //根据父名称获取父id
                        FileEntity parentEntry = fileMapper.findByNameAndProjectIdNewTime(pathArr[pathArr.length - 2], projectId);
                        if (!ObjectUtils.isEmpty(parentEntry)) {
                            fileMeta.setParentId(parentEntry.getId());
                        }
                    } else {
                        fileMeta.setParentId(parentId);
                    }

                    fileMapper.insert(fileMeta);

                    try (FileOutputStream fos = new FileOutputStream(new File(extractPath, fileMeta.getFileName()))) {
                        byte[] buffer = new byte[1024];
                        int length;
                        while ((length = zis.read(buffer)) > 0) {
                            fos.write(buffer, 0, length);
                        }
                        // 关闭当前文件输出流
                        fos.close();
                        // 完成当前条目的解压
                        zis.closeEntry();
                    }
                }
            }
        } catch (BadRequestException e) {
            log.error("导入失败", e);
            throw new BusinessException("导入失败,请联系管理员");
        } finally {
            tempZip.delete();
        }
    }

    /**
     * 删除项目相关的所有文件
     *
     * @param projectId 项目ID
     * @throws IOException 文件操作异常
     */
    public void deleteProjectFiles(Long projectId) throws IOException {
        List<FileEntity> files = fileMapper.findByProjectId(projectId);
        for (FileEntity file : files) {
            deleteFileRecursively(file);
        }
    }


    /**
     * 文件名称合法校验
     * @param fileName
     * @throws BadRequestException
     */
    private static void checkFileName(String fileName) throws BadRequestException {
        // 文件名称合法校验,包含.
        if (!fileName.matches("[\\u4e00-\\u9fa5A-Za-z0-9_.]+")) {
            throw new BadRequestException("文件名称只能包含中文、字母、数字和下划线和英文的点");
        }
        // 文件名称不能超过30个字符
        if (fileName.length() > 30) {
            throw new BadRequestException("文件名称不能超过30个字符");
        }
    }

    /**
     * 文件夹名称合法校验
     * @param folderName
     * @throws BadRequestException
     */
    private static void checkFolderName(String folderName) throws BadRequestException {
        // 文件夹名合法校验
        if (!folderName.matches("[\\u4e00-\\u9fa5A-Za-z0-9_]+")) {
            throw new BadRequestException("文件夹名只能包含中文、字母、数字和下划线");
        }
        // 文件夹名称不能超过30个字符
        if (folderName.length() > 30) {
            throw new BadRequestException("文件夹名称不能超过30个字符");
        }
    }

    public void deleteProjectDeleteFolder(Long id) throws IOException {
        fileStorageService.deleteProjectDeleteFolder(id);
    }

    /**
     * 根据项目ID获取项目压缩包
     * @param projectId 项目ID
     * @author yzb
     * @date 2025/3/31
     */
    public String getProjFileZip(Long projectId) {
        List<FileEntity> projFileList = fileMapper.findByProjectId(projectId);
        if (CollectionUtils.isEmpty(projFileList)) {
            throw new BusinessException("该项目下没有文件");
        }

        //先找到项目中的output文件夹信息
        FileEntity output = fileMapper.findByNameAndProjectId(FORNTEND_COMPILE_FILE_PATH, projectId);
        //去掉项目中的output文件夹以及output文件夹下的文件
        if (!ObjectUtils.isEmpty(output)) {
            projFileList.removeIf(fileEntity -> output.getId().equals(fileEntity.getParentId()));
            projFileList.removeIf(fileEntity -> FORNTEND_COMPILE_FILE_PATH.equals(fileEntity.getFileName()));

        }
        // 获取项目信息
        ProjectEntity projectEntity = projectMapper.selectById(projectId);
        if (Objects.isNull(projectEntity)) {
            throw new BusinessException("项目不存在");
        }
        return ZipUtil.getZipByFilesAndLevel(fileExportRoot, projFileList, projectId);
    }

    /**
     * 获取项目拓扑文件内容
     * @param projectId
     * @return
     * @throws IOException
     */
    public R getJsonContentByProjectId(Long projectId) throws IOException {
        if (ObjectUtils.isEmpty(projectId)) {
            return R.error("项目id不能为空");
        }
        List<FileEntity> jsonFiles = fileMapper.getByProjectIdAndFileType(projectId, 0);
        if (CollectionUtils.isEmpty(jsonFiles)) {
            return R.error("该项目下没有拓扑json文件");
        }
        return R.ok(fileStorageService.readFile(jsonFiles.get(0).getFilePath()));
    }

    /**
     * 更新前端编译文件
     * @param projectId 项目ID
     * @param frontCompileList 前端编译文件列表
     * @author yzb
     * @date 2025/4/9  
     */
    public void updateFrontendCompileByProjectId(Long projectId, List<CompileDeployRecordEntity> frontCompileList, String frontCompilePath) {
        if (CollectionUtils.isEmpty(frontCompileList)) {
            return;
        }
        List<FileEntity> fileEntityList = new ArrayList<>();
        // 判断是否有output文件夹，有则删除文件夹下的文件
        FileEntity outputFolder = fileMapper.findByNameAndProjectId("output", projectId);
        if (Objects.nonNull(outputFolder)) {
            // 删除文件夹下前端编译文件
            fileMapper.deleteByParentIdAndFileTypes(outputFolder.getId(), Arrays.asList(FileTypeEnum.PFOUR.getType(), FileTypeEnum.OTHER.getType()));
        } else {
            outputFolder = new FileEntity()
                    .setId(SnowflakeUtil.nextId())
                    .setProjectId(projectId)
                    .setFileName("output")
                    .setIsFolder(FolderFlagEnum.FOLDER.getCode())
                    .setFileType(FileTypeEnum.FOLDER.getType())
                    .setFilePath("/");
            fileEntityList.add(outputFolder);
        }

        for (CompileDeployRecordEntity compileDeployRecordEntity : frontCompileList) {
            // 复制文件到output文件夹下 TODO 历史编译文件是否需要保留
            FileUtil.copyToDirectory(compileDeployRecordEntity.getFilePath(), frontCompilePath);
            fileEntityList.add(new FileEntity()
                    .setId(SnowflakeUtil.nextId())
                    .setProjectId(projectId)
                    .setFileName(compileDeployRecordEntity.getFileName())
                    .setIsFolder(FolderFlagEnum.FILE.getCode())
                    .setFileType(compileDeployRecordEntity.getFileType() == 1 ? FileTypeEnum.PFOUR.getType() : FileTypeEnum.OTHER.getType())
                    .setFilePath(outputFolder.getFilePath() + compileDeployRecordEntity.getFileName())
                    .setParentId(outputFolder.getId())

            );
        }
        fileMapper.insertList(fileEntityList);
    }
}
