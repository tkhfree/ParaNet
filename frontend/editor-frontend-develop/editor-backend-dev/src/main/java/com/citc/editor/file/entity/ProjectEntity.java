package com.citc.editor.file.entity;

import java.time.LocalDateTime;
import java.util.Objects;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;

import com.citc.editor.common.util.SnowflakeUtil;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import lombok.Data;

@Data
@TableName("editor_project")
public class ProjectEntity {

    @JsonSerialize(using = ToStringSerializer.class)
    private Long id;
    
    private String name;
    
    private String remark;
    
    @TableLogic
    private Integer deleteFlag;
    
    private Integer createBy;
    
    private Integer updateBy;
    
    private LocalDateTime createAt;
    
    private LocalDateTime updateAt;

    public Long getId() {
        if (Objects.isNull(id)) {
            id = SnowflakeUtil.nextId();
        }
        return id;
    }
} 