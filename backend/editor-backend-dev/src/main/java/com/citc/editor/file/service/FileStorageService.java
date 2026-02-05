package com.citc.editor.file.service;

import com.citc.editor.common.exceptions.BadRequestException;
import com.citc.editor.common.util.SnowflakeUtil;
import com.citc.editor.file.vo.PictureVo;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.*;

/**
 * 文件存储服务
 */
@Slf4j
@Service
public class FileStorageService {
    // 读取配置中的file.storage.root
    @Value("${file.storage.root}")
    private String BASE_DIR;

    @Value("${picture.storage.root}")
    private String PICTURE_STORAGE_ROOT;

    // 定义允许上传的图片类型
    private static final String[] ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/bmp", "image/webp", "image/svg", "image/svg+xml"};

    public String saveFile(String projectId, String filename, String content, int fileType) throws IOException {
        String filePath = BASE_DIR + projectId + "/" + filename;
        Files.createDirectories(Paths.get(BASE_DIR + projectId));
        //文件类型，0-拓扑，1-pne，还有其他文件  ---创建文件时，路径加上后缀名
        if (fileType == 0) {
            filePath += ".json";
        } else if (fileType == 1) {
            filePath += ".pne";
        } else if (fileType == 2) {
            //其他类型的文件类型,需要自行判断是否有后缀名
        } else if (fileType == 4) {
            filePath += ".p4";
        } else if (fileType == 5) {
            filePath += ".domain";
        }
        Files.write(Paths.get(filePath), content.getBytes());
        return filePath;
    }

    public String readFile(String filePath) throws IOException {
        return new String(Files.readAllBytes(Paths.get(filePath)));
    }

    public void deleteFile(String filePath) throws IOException {
        Files.deleteIfExists(Paths.get(filePath));
    }

    public void deleteFolder(String folderPath) throws IOException {
        Files.deleteIfExists(Paths.get(folderPath));
    }

    public void deleteProjectDeleteFolder(Long id) throws IOException {
        Files.deleteIfExists(Paths.get(BASE_DIR + id));
    }

    public void updateFile(String filePath, String newContent) throws IOException {
        Files.write(Paths.get(filePath), newContent.getBytes(), StandardOpenOption.TRUNCATE_EXISTING);
    }

    // 递归删除文件夹及其中的所有文件
    public static void deleteFolderRecursively(Path folderPath) throws IOException {
        // 检查文件夹是否存在
        if (Files.exists(folderPath) && Files.isDirectory(folderPath)) {
            // 遍历文件夹中的所有文件和子文件夹
            try (DirectoryStream<Path> stream = Files.newDirectoryStream(folderPath)) {
                for (Path entry : stream) {
                    if (Files.isDirectory(entry)) {
                        // 如果是子文件夹，递归删除
                        deleteFolderRecursively(entry);
                    } else {
                        // 如果是文件，直接删除
                        Files.delete(entry);
                    }
                }
            }

            // 删除空文件夹
            Files.delete(folderPath);
        }
    }

    // 保存图片
    public PictureVo savePicture(MultipartFile file) throws IOException, BadRequestException {
        // 检查文件是否为空
        if (file.isEmpty()) {
            throw new BadRequestException("文件为空,请选择文件");
        }
        // 检查文件类型是否为允许的图片类型
        String mimeType = file.getContentType();
        if (!isAllowedImageType(mimeType)) {
            throw new BadRequestException("非图片类型不能上传");
        }
        //确保文件夹存在
        Files.createDirectories(Paths.get(PICTURE_STORAGE_ROOT));
        // 获取上传文件的文件名
        String fileName = file.getOriginalFilename();
        if (fileName == null || fileName.isEmpty()) {
            throw new BadRequestException("文件名为空,请选择文件");
        }
        String uniqueFileName = SnowflakeUtil.nextId() + "_" + fileName;
        String filePath = PICTURE_STORAGE_ROOT + uniqueFileName;
        // 保存文件到本地
        try {
            file.transferTo(new File(filePath));
        } catch (IOException e) {
            log.error("文件保存失败");
            throw new RuntimeException("文件保存失败");
        }
        PictureVo pictureVo = new PictureVo();
        pictureVo.setPictureName(uniqueFileName);
        pictureVo.setPicturePath(filePath);
        return pictureVo;
    }

    // 检查文件的MIME类型是否是允许的图片类型
    private boolean isAllowedImageType(String mimeType) {
        for (String allowedType : ALLOWED_IMAGE_TYPES) {
            if (allowedType.equals(mimeType)) {
                return true;
            }
        }
        return false;
    }
}
