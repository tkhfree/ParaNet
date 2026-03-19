package com.citc.editor.file.vo;

import java.time.LocalDateTime;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import lombok.Data;

@Data
public class ProjectVo {
    @JsonSerialize(using = ToStringSerializer.class)
    private Long id;
    private String name;
    private String remark;
    private Integer createBy;
    private Integer updateBy;
    private LocalDateTime createAt;
    private LocalDateTime updateAt;
} 