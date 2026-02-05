package com.citc.editor.file.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.citc.editor.file.entity.ProjectEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface ProjectMapper extends BaseMapper<ProjectEntity> {


    void updateDeleteFlagById(@Param("id") Long id);


}