package com.citc.editor.file.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.citc.editor.file.entity.CompileDeployRecordEntity;
import com.citc.editor.file.vo.CompileDeployRecordVo;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * 编译部署记录表
 *
 * @author yjd
 * @date 2025-03-31 09:16:34
 */
@Mapper
public interface CompileDeployRecordMapper extends BaseMapper<CompileDeployRecordEntity> {

    /**
     * 获取已完成部署的设备数量
     * @param projectId
     * @return
     */
    String getDeployCountByProjectId(@Param("projectId") Long projectId);

    /**
     * 已加载模态数量
     * @param projectId
     * @return
     */
    String getFrontendCompileCountByProjectId(@Param("projectId") Long projectId);

    /**
     * 获取网元设备最新一次部署记录
     * @param projectId
     * @param ip
     * @return
     */
    CompileDeployRecordEntity getOneDeployRecordNew(@Param("projectId") Long projectId, @Param("ip") String ip);

    /**
     * 获取某一个网元设备部署次数
     * @param projectId
     * @param ip
     * @return
     */
    Integer getDeployCountByProjectIdAndIp(@Param("projectId") Long projectId, @Param("ip") String ip);

    /**
     * 获取网元设备最新一次编译记录
     * @param projectId
     * @param ip
     * @return
     */
    List<CompileDeployRecordEntity> getOneCompileRecordNew(@Param("projectId")Long projectId, @Param("ip")String ip);

    /**
     * 查询该项目的最新一次的前端编译的记录
     * @param projectId
     * @return
     */
    List<CompileDeployRecordVo> getFrontendCompileFiles(@Param("projectId")Long projectId);

    /**
     * 插入编译部署记录
     * @param compileDeployRecordList
     */
    void insertList(@Param("list") List<CompileDeployRecordEntity> compileDeployRecordList);

    void updateDeleteFlagProjectId(@Param("projectId") Long projectId);

    CompileDeployRecordEntity getOneByProjectIdAndFileName(@Param("projectId")Long projectId, @Param("fileName")String fileName);
}
