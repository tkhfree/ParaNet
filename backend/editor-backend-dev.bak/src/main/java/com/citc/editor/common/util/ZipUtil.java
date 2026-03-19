package com.citc.editor.common.util;

import com.citc.editor.common.enums.ErrorCodeEnum;
import com.citc.editor.common.exceptions.BusinessException;
import com.citc.editor.file.entity.FileEntity;
import com.citc.editor.file.enums.FolderFlagEnum;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.compress.archivers.zip.ZipArchiveEntry;
import org.apache.commons.compress.archivers.zip.ZipArchiveOutputStream;
import org.apache.commons.lang3.ArrayUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.tomcat.util.http.fileupload.IOUtils;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;
import java.util.zip.ZipOutputStream;

/**
 * @Description
 * @Author yzb
 * @Date 2024年09月18日
 */
@Slf4j
public class ZipUtil {

    public static final String TEMP_DIR = System.getProperty("java.io.tmpdir");

    /**
     * 压缩级别
     */
    public static final int ZIP_LEVEL = 9;

    private ZipUtil() {
        super();
    }


    /**
     * 将多个文件输入流打成压缩包
     *
     * @param fileName 文件名称
     * @param file     文件输入流
     * @return 压缩包
     */
    public static File zipFile(String[] fileName, InputStream[] file) {
        File tempFile = new File(ZipUtil.TEMP_DIR, UUID.randomUUID().toString());
        try (FileOutputStream fos = new FileOutputStream(tempFile);
             ZipOutputStream zos = new ZipOutputStream(fos)) {
            for (int i = 0; i < fileName.length; i++) {
                zos.putNextEntry(new ZipEntry(fileName[i]));
                IOUtils.copy(file[i], zos);
                zos.closeEntry();
            }
            zos.flush();
            zos.finish();
            fos.flush();
        } catch (IOException e) {
            throw new BusinessException(ErrorCodeEnum.ZIP_FILE_ERROR.getMsg());
        }
        return tempFile;
    }

    /**
     * 向已有的zip流中添加一个文件
     *
     * @param zos          压缩输出流
     * @param file         文件
     * @param fileFullName 文件名
     */
    public static void zipSingleFileToStream(ZipOutputStream zos, File file, String fileFullName) {
        if (zos == null || !file.exists() || StringUtils.isBlank(fileFullName)) {
            throw new BusinessException(ErrorCodeEnum.ZIP_FILE_ERROR.getMsg());
        }
        try (FileInputStream fis = new FileInputStream(file)) {
            zos.putNextEntry(new ZipEntry(fileFullName));
            IOUtils.copy(fis, zos);
            zos.closeEntry();
        } catch (IOException e) {
            throw new BusinessException(ErrorCodeEnum.ZIP_FILE_ERROR.getMsg());
        }
    }

    /**
     * 将文件夹压缩成zip文件
     *
     * @param sourceFolderPath 源文件夹路径
     * @param zipFilePath      目标zip文件路径
     * @return 是否压缩成功
     * @author yzb
     * @date 2025/03/31
     */
    public static boolean zipFolder(String sourceFolderPath, String zipFilePath) {
        try {
            File sourceFolder = new File(sourceFolderPath);
            if (!sourceFolder.exists() || !sourceFolder.isDirectory()) {
                log.error("源文件夹不存在或不是一个文件夹: {}", sourceFolderPath);
                return false;
            }

            try (FileOutputStream fos = new FileOutputStream(zipFilePath);
                 ZipOutputStream zos = new ZipOutputStream(fos)) {

                zipFile(sourceFolder, sourceFolder.getName(), zos);
                return true;
            }
        } catch (Exception e) {
            log.error("压缩文件夹失败: {}", e.getMessage(), e);
            return false;
        }
    }

    /**
     * 递归压缩文件和文件夹
     *
     * @param fileToZip 要压缩的文件或文件夹
     * @param fileName  文件名
     * @param zos       ZipOutputStream对象
     * @throws IOException IO异常
     * @author yzb
     * @date 2025/03/31
     */
    private static void zipFile(File fileToZip, String fileName, ZipOutputStream zos) throws IOException {
        if (fileToZip.isHidden()) {
            return;
        }
        if (fileToZip.isDirectory()) {
            if (fileName.endsWith("/")) {
                zos.putNextEntry(new ZipEntry(fileName));
                zos.closeEntry();
            } else {
                zos.putNextEntry(new ZipEntry(fileName + "/"));
                zos.closeEntry();
            }

            File[] children = fileToZip.listFiles();
            if (children != null) {
                for (File childFile : children) {
                    zipFile(childFile, fileName + "/" + childFile.getName(), zos);
                }
            }
            return;
        }

        try (FileInputStream fis = new FileInputStream(fileToZip)) {
            ZipEntry zipEntry = new ZipEntry(fileName);
            zos.putNextEntry(zipEntry);

            byte[] bytes = new byte[1024];
            int length;
            while ((length = fis.read(bytes)) >= 0) {
                zos.write(bytes, 0, length);
            }
        }
    }

    /**
     * 压缩项目文件
     *
     * @param tmpZipPath zip文件临时路径
     * @param projFileList 项目文件列表
     * @param projectId 项目ID
     * @return 压缩包路径
     * @author yzb
     * @date 2025/04/01
     */
    public static String getZipByFilesAndLevel(String tmpZipPath, List<FileEntity> projFileList, Long projectId) {
        // 创建导出文件路径
        long id = SnowflakeUtil.nextId();
        String zipPath = tmpZipPath + File.separator + projectId + "_" + id + ".zip";
        File tempDir = null;
        try {
            // 确保导出目录存在
            Files.createDirectories(Paths.get(tmpZipPath));

            // 创建临时目录用于组织文件结构
            String tempDirPath = TEMP_DIR + File.separator + projectId + "_" + id;
            tempDir = new File(tempDirPath);
            if (Boolean.FALSE.equals(tempDir.mkdirs())) {
                log.error("创建临时目录失败: {}", tempDirPath);
                throw new BusinessException("创建临时目录失败");
            }
            // 构建文件层级结构
            for (FileEntity fileEntity : projFileList) {
                buildLevelFile(fileEntity, projFileList, tempDirPath);
            }
            // 压缩临时目录
            try (ZipArchiveOutputStream zipOut = new ZipArchiveOutputStream(Files.newOutputStream(Paths.get(zipPath)))) {
                zipOut.setLevel(ZIP_LEVEL);
                zipDirectory(tempDir, tempDir, zipOut);
            }
            return zipPath;
        } catch (IOException e) {
            log.error("创建项目压缩包失败: {}", e.getMessage(), e);
            throw new BusinessException("创建项目压缩包失败");
        } finally {
            FileUtil.deleteDirectory(tempDir);
        }
    }
    
    /**
     * 构建文件层级结构
     * @param fileEntity 文件实体
     * @param projFileList 项目文件列表
     * @param tempDirPath 临时目录路径
     * @author yzb
     * @date 2025/4/1  
     */
    public static void buildLevelFile(FileEntity fileEntity, List<FileEntity> projFileList, String tempDirPath) {
        String relativePath = buildFilePath(fileEntity, projFileList);
        // 如果是文件夹，创建对应的目录
        if (FolderFlagEnum.FOLDER.getCode().equals(fileEntity.getIsFolder())) {
            File folder = new File(tempDirPath + File.separator + relativePath);
            if (!folder.exists() && !folder.mkdirs()) {
                log.error("创建文件夹失败: {}", folder.getAbsolutePath());
            }
            return;
        }
        // 如果是文件，复制到临时目录中
        File sourceFile = new File(fileEntity.getFilePath());
        if (sourceFile.exists()) {
            File targetFile = new File(tempDirPath + File.separator + relativePath);
            // 确保目标文件的父目录存在
            File parentDir = targetFile.getParentFile();
            if (!parentDir.exists() && !parentDir.mkdirs()) {
                log.error("创建目标父目录失败: {}", parentDir.getAbsolutePath());
                return;
            }
            FileUtil.copyFile(sourceFile, targetFile);
        }
    }

    /**
     * 构建文件在压缩包中的相对路径
     *
     * @param fileEntity 文件实体
     * @param allFiles 所有文件列表
     * @return 文件相对路径
     * @author yzb
     * @date 2025/04/01
     */
    public static String buildFilePath(FileEntity fileEntity, List<FileEntity> allFiles) {
        StringBuilder path = new StringBuilder(fileEntity.getFileName());
        Long parentId = fileEntity.getParentId();
        // 递归向上查找父文件夹，构建完整路径
        while (Objects.nonNull(parentId)) {
            FileEntity parentEntity = null;
            for (FileEntity file : allFiles) {
                if (file.getId().equals(parentId)) {
                    parentEntity = file;
                    break;
                }
            }
            if (parentEntity != null) {
                path.insert(0, parentEntity.getFileName() + File.separator);
                parentId = parentEntity.getParentId();
            } else {
                break;
            }
        }
        return path.toString();
    }

    /**
     * 递归压缩目录
     *
     * @param rootDir 根目录
     * @param sourceDir 源目录
     * @param zipOut 压缩输出流
     * @throws IOException IO异常
     * @author yzb
     * @date 2025/04/01
     */
    public static void zipDirectory(File rootDir, File sourceDir, ZipArchiveOutputStream zipOut) throws IOException {
        File[] files = sourceDir.listFiles();
        if (ArrayUtils.isEmpty(files)) {
            return;
        }
        for (File file : files) {
            // 计算文件相对于根目录的路径
            String entryName = file.getAbsolutePath().substring(rootDir.getAbsolutePath().length() + 1)
                    .replace("\\", "/");

            if (file.isDirectory()) {
                // 添加目录条目
                if (!entryName.isEmpty()) {
                    ZipArchiveEntry zipEntry = new ZipArchiveEntry(entryName + "/");
                    zipOut.putArchiveEntry(zipEntry);
                    zipOut.closeArchiveEntry();
                }
                // 递归处理子目录
                zipDirectory(rootDir, file, zipOut);
            } else {
                // 添加文件条目
                ZipArchiveEntry zipEntry = new ZipArchiveEntry(entryName);
                zipOut.putArchiveEntry(zipEntry);
                // 写入文件内容
                try (FileInputStream fis = new FileInputStream(file)) {
                    byte[] buffer = new byte[1024];
                    int length;
                    while ((length = fis.read(buffer)) > 0) {
                        zipOut.write(buffer, 0, length);
                    }
                }

                zipOut.closeArchiveEntry();
            }
        }
    }

    /**
     * 将多个文件压缩成zip文件
     * @param filePaths 文件路径列表
     * @param zipFilePath 压缩文件路径
     * @author yzb
     * @date 2025/4/7  
     */
    public static void zipByFilePaths(List<String> filePaths, String zipFilePath) {
        if (CollectionUtils.isEmpty(filePaths) || StringUtils.isBlank(zipFilePath)) {
            log.error("文件路径列表为空或ZIP文件路径为空");
            throw new BusinessException(ErrorCodeEnum.ZIP_FILE_ERROR.getMsg());
        }

        // 确保目标ZIP文件的父目录存在
        File zipFile = new File(zipFilePath);
        File parentDir = zipFile.getParentFile();
        if (parentDir != null && !parentDir.exists() && !parentDir.mkdirs()) {
            log.error("创建ZIP文件父目录失败: {}", parentDir.getAbsolutePath());
            throw new BusinessException(ErrorCodeEnum.ZIP_FILE_ERROR.getMsg());
        }

        try (FileOutputStream fos = new FileOutputStream(zipFilePath);
             ZipArchiveOutputStream zipOut = new ZipArchiveOutputStream(fos)) {

            zipOut.setLevel(ZIP_LEVEL);

            for (String filePath : filePaths) {
                File file = new File(filePath);
                if (!file.exists()) {
                    log.warn("文件不存在，跳过: {}", filePath);
                    continue;
                }

                if (file.isDirectory()) {
                    // 如果是目录，递归压缩整个目录
                    zipDirectory(file, file, zipOut);
                } else {
                    // 如果是文件，直接添加到ZIP
                    String entryName = file.getName();
                    ZipArchiveEntry zipEntry = new ZipArchiveEntry(entryName);
                    zipOut.putArchiveEntry(zipEntry);

                    try (FileInputStream fis = new FileInputStream(file)) {
                        byte[] buffer = new byte[1024];
                        int length;
                        while ((length = fis.read(buffer)) > 0) {
                            zipOut.write(buffer, 0, length);
                        }
                    }

                    zipOut.closeArchiveEntry();
                }
            }

            zipOut.finish();
            log.info("成功将{}个文件压缩到: {}", filePaths.size(), zipFilePath);
        } catch (IOException e) {
            log.error("压缩文件失败: {}", e.getMessage(), e);
            throw new BusinessException(ErrorCodeEnum.ZIP_FILE_ERROR.getMsg());
        }
    }

    /**
     * 解压ZIP文件到指定目录
     *
     * @param zipFilePath 压缩文件路径
     * @param destDirPath 解压目标路径
     * @return 是否解压成功
     * @author yzb
     * @date 2025/04/02
     */
    public static boolean unzip(String zipFilePath, String destDirPath) {
        File zipFile = new File(zipFilePath);
        if (!zipFile.exists()) {
            log.error("ZIP文件不存在: {}", zipFilePath);
            return false;
        }

        File destDir = new File(destDirPath);
        // 创建解压目标目录
        if (!destDir.exists() && !destDir.mkdirs()) {
            log.error("创建解压目标目录失败: {}", destDirPath);
            return false;
        }

        try (java.util.zip.ZipFile zip = new java.util.zip.ZipFile(zipFile)) {
            java.util.Enumeration<? extends ZipEntry> entries = zip.entries();
            while (entries.hasMoreElements()) {
                ZipEntry entry = entries.nextElement();
                String entryName = entry.getName();
                File entryFile = new File(destDir, entryName);

                // 防止ZIP炸弹攻击，检查解压后的文件路径是否在目标目录内
                String canonicalDestPath = destDir.getCanonicalPath();
                String canonicalEntryPath = entryFile.getCanonicalPath();
                if (!canonicalEntryPath.startsWith(canonicalDestPath + File.separator) &&
                        !canonicalEntryPath.equals(canonicalDestPath)) {
                    log.error("ZIP条目路径不在目标目录内，可能是ZIP炸弹攻击: {}", entryName);
                    return false;
                }

                // 如果是目录，创建目录
                if (entry.isDirectory()) {
                    if (!entryFile.exists() && !entryFile.mkdirs()) {
                        log.error("创建目录失败: {}", entryFile.getAbsolutePath());
                        return false;
                    }
                } else {
                    // 确保父目录存在
                    File parent = entryFile.getParentFile();
                    if (!parent.exists() && !parent.mkdirs()) {
                        log.error("创建父目录失败: {}", parent.getAbsolutePath());
                        return false;
                    }

                    // 解压文件
                    try (InputStream is = zip.getInputStream(entry);
                         FileOutputStream fos = new FileOutputStream(entryFile)) {
                        byte[] buffer = new byte[1024];
                        int length;
                        while ((length = is.read(buffer)) > 0) {
                            fos.write(buffer, 0, length);
                        }
                    }
                }
            }
            return true;
        } catch (IOException e) {
            log.error("解压ZIP文件失败: {}", e.getMessage(), e);
            return false;
        }
    }


    /**
     * 解压ZIP文件到指定目录，并返回解压后的文件列表
     *
     * @param zipFilePath 压缩文件路径
     * @param destDirPath 解压目标路径
     * @return 解压后的文件列表，解压失败返回空列表
     * @author yzb
     * @date 2025/04/02
     */
    public static List<File> unzipAndGetFiles(String zipFilePath, String destDirPath) {
        List<File> extractedFiles = new java.util.ArrayList<>();
        File zipFile = new File(zipFilePath);
        if (!zipFile.exists()) {
            log.error("ZIP文件不存在: {}", zipFilePath);
            return extractedFiles;
        }

        File destDir = new File(destDirPath);
        // 创建解压目标目录
        if (!destDir.exists() && !destDir.mkdirs()) {
            log.error("创建解压目标目录失败: {}", destDirPath);
            return extractedFiles;
        }

        try (java.util.zip.ZipFile zip = new java.util.zip.ZipFile(zipFile)) {
            java.util.Enumeration<? extends ZipEntry> entries = zip.entries();
            while (entries.hasMoreElements()) {
                ZipEntry entry = entries.nextElement();
                String entryName = entry.getName();
                File entryFile = new File(destDir, entryName);

                // 防止ZIP炸弹攻击
                String canonicalDestPath = destDir.getCanonicalPath();
                String canonicalEntryPath = entryFile.getCanonicalPath();
                if (!canonicalEntryPath.startsWith(canonicalDestPath + File.separator) &&
                        !canonicalEntryPath.equals(canonicalDestPath)) {
                    log.error("ZIP条目路径不在目标目录内，可能是ZIP炸弹攻击: {}", entryName);
                    return new java.util.ArrayList<>();
                }

                // 如果是目录，创建目录
                if (entry.isDirectory()) {
                    if (!entryFile.exists() && !entryFile.mkdirs()) {
                        log.error("创建目录失败: {}", entryFile.getAbsolutePath());
                        return new java.util.ArrayList<>();
                    }
                } else {
                    // 确保父目录存在
                    File parent = entryFile.getParentFile();
                    if (!parent.exists() && !parent.mkdirs()) {
                        log.error("创建父目录失败: {}", parent.getAbsolutePath());
                        return new java.util.ArrayList<>();
                    }

                    // 解压文件
                    try (InputStream is = zip.getInputStream(entry);
                         FileOutputStream fos = new FileOutputStream(entryFile)) {
                        byte[] buffer = new byte[1024];
                        int length;
                        while ((length = is.read(buffer)) > 0) {
                            fos.write(buffer, 0, length);
                        }
                    }
                    extractedFiles.add(entryFile);
                }
            }
            return extractedFiles;
        } catch (IOException e) {
            log.error("解压ZIP文件失败: {}", e.getMessage(), e);
            return new java.util.ArrayList<>();
        }
    }

    /**
     * 检查ZIP文件是否有效
     *
     * @param zipFilePath ZIP文件路径
     * @return 是否是有效的ZIP文件
     * @author yzb
     * @date 2025/04/02
     */
    public static boolean checkValidZipFile(String zipFilePath) {
        try (ZipFile zipFile = new ZipFile(new File(zipFilePath))) {
            return Boolean.TRUE;
        } catch (IOException e) {
            log.error("无效的ZIP文件: {}", zipFilePath);
            return Boolean.FALSE;
        }
    }
}
