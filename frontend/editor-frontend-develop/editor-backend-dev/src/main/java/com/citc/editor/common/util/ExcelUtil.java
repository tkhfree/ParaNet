package com.citc.editor.common.util;

import com.alibaba.excel.EasyExcelFactory;
import com.alibaba.excel.write.builder.ExcelWriterBuilder;
import com.alibaba.excel.write.style.column.LongestMatchColumnWidthStyleStrategy;
import com.citc.editor.common.exceptions.BusinessException;
import lombok.extern.slf4j.Slf4j;

import javax.servlet.http.HttpServletResponse;
import java.io.File;
import java.io.IOException;
import java.io.OutputStream;
import java.net.URLEncoder;
import java.util.List;

/**
 * @Description
 * @Author yzb
 * @Date 2024年11月22日
 */
@Slf4j
public class ExcelUtil {

    private ExcelUtil() {}

    /**
     * 根据对象导出excel
     * @param fileName 导出文件名，无需带后缀
     * @param data      数据
     * @param clazz      对象类型
     * @param response   HttpServletResponse
     * @author yzb
     * @date 2024/11/22
     */
    public static void export(String fileName, List<?> data, Class<?> clazz, HttpServletResponse response) {
        OutputStream outputStream = null;
        try {
            outputStream = getOutputStream(fileName, response);
            ExcelWriterBuilder excelWriterBuilder = EasyExcelFactory.write(outputStream, clazz);
            excelWriterBuilder.registerWriteHandler(new LongestMatchColumnWidthStyleStrategy());
            excelWriterBuilder.sheet(fileName).doWrite(data);
            outputStream.flush();
        } catch (Exception e) {
            throw new BusinessException("导出失败");
        } finally {
            try {
                if (outputStream != null)
                    outputStream.close();
            } catch (Exception e) {
                log.error("excel导出异常：{}", e.getMessage());
            }
        }
    }

    /**
     * 根据对象导出excel
     * @param fileName 导出文件名，无需带后缀
     * @param headers 动态表头
     * @param data    动态数据
     * @param response   HttpServletResponse
     * @author yzb
     * @date 2024/11/22
     */
    public static void export(String fileName, List<List<String>> headers, List<List<Object>> data, HttpServletResponse response) {
        OutputStream outputStream = null;
        try {
            outputStream = getOutputStream(fileName, response);
            ExcelWriterBuilder excelWriterBuilder = EasyExcelFactory.write(outputStream);
            excelWriterBuilder.registerWriteHandler(new LongestMatchColumnWidthStyleStrategy());
            excelWriterBuilder.head(headers)
                    .sheet(fileName)
                    .doWrite(data);
            outputStream.flush();
        } catch (Exception e) {
            throw new BusinessException("导出失败");
        } finally {
            try {
                if (outputStream != null)
                    outputStream.close();
            } catch (Exception e) {
                log.error("excel导出异常：{}", e.getMessage());
            }
        }
    }

    /**
     * 获取输出流
     * @param fileName 文件名
     * @param response  HttpServletResponse
     * @author yzb
     * @date 2024/11/22
     */
    public static OutputStream getOutputStream(String fileName, HttpServletResponse response) {
        try {
            response.setContentType("application/octet-stream");
            response.setHeader("Content-Disposition", "attachment;filename=" + URLEncoder.encode(fileName + ".xlsx", "UTF-8"));
            response.setCharacterEncoding("UTF-8");
            return response.getOutputStream();
        } catch (IOException e) {
            throw new BusinessException("导出失败");
        }
    }


    /**
     * 获取输出流
     * @param fileName 文件名
     * @param response  HttpServletResponse
     * @author yzb
     * @date 2024/11/22
     */
    public static OutputStream getOutputStreamContainsSuffix(String fileName, HttpServletResponse response) {
        try {
            response.setContentType("application/octet-stream");
            response.setHeader("Content-Disposition", "attachment;filename=" + URLEncoder.encode(fileName, "UTF-8"));
            response.setCharacterEncoding("UTF-8");
            return response.getOutputStream();
        } catch (IOException e) {
            throw new BusinessException("导出失败");
        }
    }

    /**
     * 写入指定sheet数据，仅限于指定的sheet是空的
     * @param fileName 导出文件名，无需带后缀
     * @param templateFile 模板文件
     * @param sheetName sheet名称
     * @param data      数据
     * @param clazz      对象类型
     * @param response   HttpServletResponse
     * @author yzb
     * @date 2024/11/22
     */
    public static void updateTemplate(String fileName, File templateFile, String sheetName, List<?> data, Class<?> clazz, HttpServletResponse response) {
        OutputStream outputStream = null;
        try {
            outputStream = getOutputStreamContainsSuffix(fileName, response);
            ExcelWriterBuilder excelWriterBuilder = EasyExcelFactory.write(outputStream, clazz);
            excelWriterBuilder.withTemplate(templateFile);
            excelWriterBuilder.registerWriteHandler(new LongestMatchColumnWidthStyleStrategy());
            excelWriterBuilder.sheet(sheetName).doWrite(data);
            outputStream.flush();
        } catch (Exception e) {
            throw new BusinessException("导出失败");
        } finally {
            try {
                if (outputStream != null)
                    outputStream.close();
            } catch (Exception e) {
                log.error("excel导出异常：{}", e.getMessage());
            }
        }
    }




}
