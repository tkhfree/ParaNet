package com.citc.editor.file.vo;

import java.time.LocalDateTime;
import java.util.List;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import lombok.Data;

@Data
public class FileVo {
    /**
     * ID
     */
    @JsonSerialize(using = ToStringSerializer.class)
    private Long id;
    /**
     * 文件名
     */
    private String fileName;
    /**
     * 文件类型，0：文件，1：文件夹
     */
    private Integer isFolder;
    /**
     * 文件类型，0-拓扑，1-pne
     */
    private Integer fileType;
    /**
     * 项目ID
     */
    @JsonSerialize(using = ToStringSerializer.class)
    private Long projectId;
    /**
     * 父级ID
     */
    @JsonSerialize(using = ToStringSerializer.class)
    private Long parentId;
    /**
     * 备注
     */
    private String remark;
    /**
     * 路径
     */
    private String filePath;

    /**
     * 创建人id
     */
    private Integer createBy;

    /**
     * 更新人id
     */
    private Integer updateBy;

    /**
     * 创建时间
     */
    private LocalDateTime createAt;

    /**
     * 更新时间
     */
    private LocalDateTime updateAt;

    /**
     * 递归树结构
     */
    private List<FileVo> children;
}
