package com.citc.editor.common.util;

import com.citc.editor.common.enums.ErrorCodeEnum;
import com.citc.editor.common.exceptions.BusinessException;
import lombok.extern.slf4j.Slf4j;
import org.apache.tomcat.util.http.fileupload.IOUtils;

import javax.servlet.http.HttpServletResponse;
import java.io.*;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/**
 * @Description
 * @Author yzb
 * @Date 2024年09月18日
 */
@Slf4j
public class DownloadUtil {

    /**
     * 设置下载文件的名称
     *
     * @param response 返回请求
     * @param fileName 文件名
     */
    public static void setFileName(HttpServletResponse response, String fileName) {
        response.setContentType("multipart/form-data");
        try {
            response.setHeader("Content-Disposition", "attachment;filename="
                    + URLEncoder.encode(fileName, "UTF-8").replaceAll("\\+", "%20"));
        } catch (UnsupportedEncodingException e) {
            response.setHeader("Content-Disposition", "attachment;filename="
                    + new String(fileName.getBytes(StandardCharsets.UTF_8), StandardCharsets.ISO_8859_1));
        }

    }

    /**
     * 下载文件
     *
     * @param response 返回请求
     * @param file     下载的文件
     */
    public static void download(HttpServletResponse response, InputStream file) {
        try (OutputStream os = response.getOutputStream()) {
            IOUtils.copy(file, os);
            os.flush();
        } catch (IOException e) {
            throw new BusinessException("下载失败");
        }
    }

    /**
     * 批量下载文件
     *
     * @param response 返回请求
     * @param file     下载的文件
     */
    public static void download(HttpServletResponse response, String[] fileName, InputStream[] file) {
        if (fileName.length != file.length || fileName.length <= 0) {
            throw new BusinessException(ErrorCodeEnum.DOWNLOAD_ERROR.getMsg());
        }
        String zipName = String.format("%s等%s个文件.zip", fileName[0], fileName.length);
        download(response, zipName, fileName, file);
    }

    /**
     * 设置下载文件的名称并下载
     *
     * @param response 返回请求
     * @param fileName 文件名
     * @param file     下载的文件流
     */
    public static void download(HttpServletResponse response, String fileName, InputStream file) {
        DownloadUtil.setFileName(response, fileName);
        DownloadUtil.download(response, file);
    }

    /**
     * 批量下载文件
     *
     * @param response 返回请求
     * @param file     下载的文件
     */
    public static void download(HttpServletResponse response, String zipName, String[] fileName, InputStream[] file) {
        DownloadUtil.setFileName(response, zipName);
        File zipFile = ZipUtil.zipFile(fileName, file);
        try (FileInputStream fis = new FileInputStream(zipFile);
             OutputStream os = response.getOutputStream()) {
            IOUtils.copy(fis, os);
            os.flush();
            zipFile.delete();
        } catch (IOException e) {
            throw new BusinessException(ErrorCodeEnum.DOWNLOAD_ERROR.getMsg());
        }
    }

}
