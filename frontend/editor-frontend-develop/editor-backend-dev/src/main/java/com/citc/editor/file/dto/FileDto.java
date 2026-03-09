package com.citc.editor.file.dto;

import lombok.Data;

@Data
public class FileDto {

    /**
     * 项目id
     */
    private Long projectId;

    /**
     * 文件id
     */
    private Long fileId;

    /**
     * 父文件id
     */
    private Long parentId;

    /**
     * 文件名
     */
    private String fileName;

    /**
     * 是否为文件夹，0-否，1-是
     */
    private Integer isFolder;

    /**
     * 文件类型，0-拓扑，1-pne
     */
    private Integer fileType;

    /**
     * 文件内容
     */
    private String content;
}
