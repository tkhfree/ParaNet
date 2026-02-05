package com.citc.editor.common.util;

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;

import java.io.*;
import java.nio.file.Files;

/**
 * @Description
 * @Author yzb
 * @Date 2025年04月01日
 */
@Slf4j
public class FileUtil {

	public FileUtil() {}

	/**
	 * 删除文件
	 * @author yzb
	 * @date 2025/4/1  
	 */
	public static void deleteFile(File file) {
		if (!file.exists()) {
			return;
		}
		try {
			Files.delete(file.toPath());
		} catch (IOException e) {
			log.warn("删除失败: {}, 原因: {}", file.getAbsolutePath(), e.getMessage());
		}
	}

	/**
	 * 递归删除目录及其内容
	 *
	 * @param directory 要删除的目录
	 * @author yzb
	 * @date 2025/4/1
	 */
	public static void deleteDirectory(File directory) {
		if (directory == null || !directory.exists()) {
			return;
		}
		File[] files = directory.listFiles();
		if (files != null) {
			for (File file : files) {
				if (file.isDirectory()) {
					deleteDirectory(file);
					continue;
				}
				deleteFile(file);
			}
		}
		deleteFile(directory);
	}
	
	/**
	 * 复制文件
	 * @param source 源文件
	 * @param target 目标文件
	 * @author yzb
	 * @date 2025/4/1  
	 */
	public static void copyFile(File source, File target) {
		try (
			 FileInputStream fis = new FileInputStream(source);
			 FileOutputStream fos = new FileOutputStream(target)
		) {
			byte[] buffer = new byte[1024];
			int length;
			while ((length = fis.read(buffer)) > 0) {
				fos.write(buffer, 0, length);
			}
		} catch (IOException e) {
			log.warn("复制失败: {}, 原因: {}", source.getAbsolutePath(), e.getMessage());
		}
	}

	/**
	 * 判断文件是否为文件夹
	 *
	 * @param file 文件对象
	 * @return 是否为文件夹
	 * @author yzb
	 * @date 2025/04/02
	 */
	public static boolean isDirectory(File file) {
		return file != null && file.exists() && file.isDirectory();
	}

	/**
	 * 判断文件是否存在
	 *
	 * @param filePath 文件路径
	 * @return 是否存在
	 * @author yzb
	 * @date 2025/04/02
	 */
	public static boolean existsByPath(String filePath) {
		return StringUtils.isNotBlank(filePath) && new File(filePath).exists();
	}

	/**
	 * 复制文件或目录到目标位置
	 * @param sourcePath 源文件或目录路径
	 * @param targetPath 目标路径
	 * @return 是否复制成功
	 * @author yzb
	 * @date 2025/04/09
	 */
	public static boolean copyToDirectory(String sourcePath, String targetPath) {
		if (StringUtils.isBlank(sourcePath) || StringUtils.isBlank(targetPath)) {
			return false;
		}

		File source = new File(sourcePath);
		File target = new File(targetPath);

		if (!source.exists()) {
			log.warn("源文件不存在: {}", sourcePath);
			return false;
		}

		try {
			if (source.isDirectory()) {
				// 复制目录
				File newTarget = new File(target, source.getName());
				if (!newTarget.exists() && !newTarget.mkdirs()) {
					log.warn("创建目标目录失败: {}", newTarget.getAbsolutePath());
					return false;
				}

				File[] files = source.listFiles();
				if (files != null) {
					for (File file : files) {
						copyToDirectory(file.getAbsolutePath(), newTarget.getAbsolutePath());
					}
				}
			} else {
				// 复制文件
				if (!target.exists() && !target.mkdirs()) {
					log.warn("创建目标目录失败: {}", target.getAbsolutePath());
					return false;
				}

				File targetFile = new File(target, source.getName());
				copyFile(source, targetFile);
			}
			return true;
		} catch (Exception e) {
			log.error("复制失败: {} -> {}, 原因: {}", sourcePath, targetPath, e.getMessage());
			return false;
		}
	}
}
