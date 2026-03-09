package com.citc.editor.file.service;

import com.citc.editor.common.R;
import com.citc.editor.common.exceptions.BadRequestException;
import com.citc.editor.file.entity.CompileDeployRecordEntity;
import com.citc.editor.file.mapper.CompileDeployRecordMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.ObjectUtils;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
public class CompileDeployRecordService {

    @Autowired
    private CompileDeployRecordMapper compileDeployRecordMapper;

    @Autowired
    private FileStorageService fileStorageService;

    /**
     * 查询项目所有设备已部署模态数量and已加载模态数量
     * @param projectId
     * @return
     * @throws BadRequestException
     */
    public R getDeployCountByProjectId(Long projectId) throws BadRequestException {
        if (ObjectUtils.isEmpty(projectId)) {
            throw new BadRequestException("项目id不能为空");
        }
        //已部署模态数量
        String deployCountByProjectId = compileDeployRecordMapper.getDeployCountByProjectId(projectId);
        //已加载模态数量-后端编译成功数量
        String compileCountByProjectId = compileDeployRecordMapper.getFrontendCompileCountByProjectId(projectId);
        Map<String,String> result = new HashMap<>();
        result.put("deployCount", deployCountByProjectId);
        result.put("compileCount", compileCountByProjectId);
        return R.ok(result);
    }

    /**
     * 根据项目id和设备ip查询最后一次部署信息
     * @param projectId
     * @return
     * @throws BadRequestException
     */
    public CompileDeployRecordEntity getOneDeployRecordNew(Long projectId, String ip) throws BadRequestException {
        return compileDeployRecordMapper.getOneDeployRecordNew(projectId, ip);
    }

    /**
     * 根据项目id和设备ip查询网元设备部署次数
     * @param projectId
     * @return
     * @throws BadRequestException
     */
    public Integer getDeployCountByProjectIdAndIp(Long projectId, String ip) throws BadRequestException {
        return compileDeployRecordMapper.getDeployCountByProjectIdAndIp(projectId, ip);
    }


    /**
     * 查询该项目的最新一次的前端编译的记录
     * @param projectId
     * @return
     */
    public R getFrontendCompileFiles(Long projectId) {

        return R.ok(compileDeployRecordMapper.getFrontendCompileFiles(projectId));
    }

    public R getFrontendCompileFileContent(Long id) throws BadRequestException, IOException {
        if (ObjectUtils.isEmpty(id)) {
            throw new BadRequestException("id不能为空");
        }
        CompileDeployRecordEntity compileDeployRecordEntity = compileDeployRecordMapper.selectById(id);

        return R.ok(fileStorageService.readFile(compileDeployRecordEntity.getFilePath()));

    }
}
