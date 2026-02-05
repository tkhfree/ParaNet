package com.citc.editor.file.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.citc.editor.common.R;
import com.citc.editor.common.ResponseObj;
import com.citc.editor.common.ResponseObjFront;
import com.citc.editor.common.exceptions.BadRequestException;
import com.citc.editor.common.exceptions.BusinessException;
import com.citc.editor.common.util.*;
import com.citc.editor.file.entity.CompileDeployRecordEntity;
import com.citc.editor.file.entity.CompileLogsEntity;
import com.citc.editor.file.entity.FileEntity;
import com.citc.editor.file.enums.FileEndWithTypeEnum;
import com.citc.editor.file.enums.FileTypeEnum;
import com.citc.editor.file.enums.OperationTypeEnum;
import com.citc.editor.file.mapper.CompileDeployRecordMapper;
import com.citc.editor.file.mapper.CompileLogsMapper;
import com.citc.editor.file.mapper.FileMapper;
import com.citc.editor.file.vo.CompileDeployRecordVo;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.collections4.MapUtils;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.ObjectUtils;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
public class RemoteCallService {


    @Value("${remote.url.base}")
    private String baseUrl;

    @Value("${remote.url.frontend.compile}")
    private String frontendCompileUrl;


    @Value("${remote.url.deploy}")
    private String deployUrl;

    @Value("${remote.url.backend.compile}")
    private String backendCompileUrl;

    @Value("${remote.url.frontend.log}")
    private String frontendLogUrl;

    @Value("${remote.url.backend.log}")
    private String backendLogUrl;

    @Value("${file.compile.root}")
    private String fileCompileRoot;

    @Value("${file.storage.root}")
    private String fileStorageRoot;

    @Value("${file.export.root}")
    private String fileExportRoot;

    @Value("${remote.call.service.status}")
    private String remoteCallServiceStatus;

    @Autowired
    private CompileDeployRecordMapper compileDeployRecordMapper;
    @Autowired
    private CompileLogsMapper compileLogsMapper;

    @Autowired
    private FileService fileService;

    @Autowired
    private FileMapper fileMapper;

    @Autowired
    private FileStorageService fileStorageService;

    private static final String HTTP_PREFIX = "http://";
    private static final String HTTP_PORT = ":5000";

    /**
     * 前端编译文件存放文件夹
     */
    private static final String FORNTEND_COMPILE_FILE_PATH = "output";

    private String frontendCompileFilePath(Long projectId) {
        return fileStorageRoot + File.separator + projectId + File.separator + FORNTEND_COMPILE_FILE_PATH;
    }

    /**
     * 是否是mock模式
     */
    private Boolean mockFlag() {
        return ("mock").equals(remoteCallServiceStatus);
    }

    /**
     * 前端编译
     * @param projectId 项目ID
     * @return R
     */
    public R frontendCompile(Long projectId) {
        if (Boolean.TRUE.equals(mockFlag())) {
            return R.ok("前端编译成功.......");
        }
        return remoteFrontendCompile(projectId);
    }

    /**
     * 部署
     * @param projectId 项目ID
     * @param deviceName 设备名称
     * @return
     */
    public R deploy(Long projectId, String deviceName) throws BadRequestException, IOException {
        if (Boolean.TRUE.equals(mockFlag())) {
            return R.ok(String.format("%n设备%s的部署返回结果为:*******", deviceName));
        }
        LocalDateTime today = LocalDateTime.now();

        if (ObjectUtils.isEmpty(projectId)) {
            throw new BadRequestException("项目id不能为空");
        }
        if (ObjectUtils.isEmpty(deviceName)) {
            throw new BadRequestException("设备名称不能为空");
        }

        //获取项目的path.json文件
        List<FileEntity> pathFiles = fileMapper.getByProjectIdAndFileTypeAndFileName(projectId, FileTypeEnum.OTHER.getType(), "path.json");
        if (CollectionUtils.isEmpty(pathFiles)) {
            throw new BusinessException("没有找到path.json文件");
        }
        String pathFilePath = "";
        if (!CollectionUtils.isEmpty(pathFiles)) {
            pathFilePath = pathFiles.get(0).getFilePath();
        }
        if (!new File(pathFilePath).exists()) {
            throw new BusinessException("path.json文件不存在，无法解析编译文件");
        }

        //根据路径解析path.json文件中的设备名和ip对应的信息
        Map<String, String> networkElementMap = getDeviceMapByFilePath(pathFilePath);

//            Map<String, String> networkElementMap = JsonTopologyParser.parseNetElementInfo(topologyFilePath);
        if (MapUtils.isEmpty(networkElementMap)) {
            throw new BusinessException("未获取到设备名称和ip对应关系信息");
        }
        String ip = networkElementMap.get(deviceName);
        if (StringUtils.isEmpty(ip)) {
            throw new BusinessException("未获取到设备名称对应的ip信息");
        }

        // 调用甲方接口--部署
        return R.ok("部署日志: \n设备 " + deviceName + " " + ip + " " + remoteDeploy(projectId, ip, today));
    }

    /**
     * 后端编译
     * @param projectId 项目ID
     * @param deviceName 设备名换
     * @return
     */
    public R backendCompile(Long projectId, String deviceName) throws BadRequestException, IOException {
        if (Boolean.TRUE.equals(mockFlag())) {
            return R.ok(String.format("%n设备%s的后端编译日志为:*******", deviceName));
        }
        LocalDateTime today = LocalDateTime.now();
        if (ObjectUtils.isEmpty(projectId)) {
            throw new BadRequestException("项目id不能为空");
        }
        if (ObjectUtils.isEmpty(deviceName)) {
            throw new BadRequestException("设备名称不能为空");
        }

        //获取项目的path.json文件
        List<FileEntity> pathFiles = fileMapper.getByProjectIdAndFileTypeAndFileName(projectId, FileTypeEnum.OTHER.getType(), "path.json");
        if (CollectionUtils.isEmpty(pathFiles)) {
            throw new BusinessException("没有找到path.json文件");
        }
        String pathFilePath = "";
        if (!CollectionUtils.isEmpty(pathFiles)) {
            pathFilePath = pathFiles.get(0).getFilePath();
        }
        if (!new File(pathFilePath).exists()) {
            throw new BusinessException("path.json文件不存在，无法解析编译文件");
        }

        //根据路径解析path.json文件中的设备名和ip对应的信息
        Map<String, String> networkElementMap = getDeviceMapByFilePath(pathFilePath);
        log.info("networkElementMap: {}", networkElementMap.toString());

//            Map<String, String> networkElementMap = JsonTopologyParser.parseNetElementInfo(topologyFilePath);
        if (MapUtils.isEmpty(networkElementMap)) {
            throw new BusinessException("未获取到设备名称和ip对应关系信息");
        }
        String ip = networkElementMap.get(deviceName);
        if (StringUtils.isEmpty(ip)) {
            throw new BusinessException("未获取到设备名称对应的ip信息");
        }

        //调用甲方接口--后端编译
        return R.ok("后端编译日志: \n设备 " + deviceName + " " + ip + ": " + remoteBackendCompile(projectId, ip, today));
    }

    /**
     * 一键操作(前端编译+部署+后端编译)
     * @param projectId 项目ID
     * @return
     */
    public R easyShuttle(Long projectId) throws BadRequestException, IOException {
        Map<String, String> resultMap = new HashMap<>();
        if (Boolean.TRUE.equals(mockFlag())) {
            resultMap.put("frontendCompileLog", "前端编译日志: " + "前端编译成功......");
            resultMap.put("deployLog", "部署日志为: " + "部署成功......");
            resultMap.put("backendCompileLog", "后端编译日志为: " + "后端编译成功......");
            return R.ok(resultMap);
        }
        LocalDateTime today = LocalDateTime.now();
        if (ObjectUtils.isEmpty(projectId)) {
            throw new BadRequestException("项目id不能为空");
        }

        //1.调用甲方接口--前端编译
        R frontendCompile = remoteFrontendCompile(projectId);
        if (frontendCompile.getCode() == 0) {
            resultMap.put("frontendCompileLog", frontendCompile.getData().toString());

            //查询最后一次前端编译记录(主要获取ip)
            List<CompileDeployRecordVo> frontendCompileRecords = compileDeployRecordMapper.getFrontendCompileFiles(projectId);
            if (CollectionUtils.isEmpty(frontendCompileRecords)) {
                return R.error("没有找到前端编译记录");
            }
            List<String> ips = frontendCompileRecords.stream()
                    .map(CompileDeployRecordVo::getOperationIp)
                    .distinct()
                    .collect(Collectors.toList());
            if (CollectionUtils.isEmpty(ips)) {
                return R.error("没有找到前端编译记录");
            }

            //获取项目的path.json文件
            List<FileEntity> pathFiles = fileMapper.getByProjectIdAndFileTypeAndFileName(projectId, FileTypeEnum.OTHER.getType(), "path.json");
            if (CollectionUtils.isEmpty(pathFiles)) {
                throw new BusinessException("没有找到path.json文件");
            }
            String pathFilePath = "";
            if (!CollectionUtils.isEmpty(pathFiles)) {
                pathFilePath = pathFiles.get(0).getFilePath();
            }
            if (!new File(pathFilePath).exists()) {
                throw new BusinessException("path.json文件不存在，无法解析编译文件");
            }

            //根据路径解析path.json文件中的设备名和ip对应的信息
            Map<String, String> networkElementMap = getDeviceMapByFilePath(pathFilePath);

//            Map<String, String> networkElementMap = JsonTopologyParser.parseNetElementInfo(topologyFilePath);
            if (MapUtils.isEmpty(networkElementMap)) {
                throw new BusinessException("未获取到设备名称和ip对应关系信息");
            }

            String deployLog = "部署日志:\n";
            String backendCompileLog = "后端编译日志:\n";
            for (String ip : ips) {
                String key = findKeyByValue(networkElementMap, ip);
                if (StringUtils.isEmpty(key)) {
                    throw new BusinessException("未获取到ip对应的设备名称");
                }
                deployLog += "设备 " + key + " " + ip + " " + remoteDeploy(projectId, ip, today) + "\n";
                backendCompileLog += "设备 " + key + " " + ip + "的后端编译日志为: \n" + remoteBackendCompile(projectId, ip, today) + "\n";
            }

            //2.调用甲方接口--部署
            //调用甲方接口--部署
            resultMap.put("deployLog", deployLog);

            //3.调用甲方接口--后端编译
            //调用甲方接口--后端编译
            resultMap.put("backendCompileLog", backendCompileLog);
        } else {
            return R.error("前端编译失败");
        }
        return R.ok(resultMap);
    }


    //=====调用甲方接口方法==============================================================================================================


    /**
     * 调用甲方接口--前端编译
     * @param projectId 项目ID
     * @return R
     */
    private R remoteFrontendCompile(Long projectId) {
        LocalDateTime today = LocalDateTime.now();
        File example = new File(fileService.getProjFileZip(projectId));
        if (!example.exists()) {
            log.info("没有找到项目文件");
            return R.error("没有找到项目文件");
        }
        Map<String, Object> params = new HashMap<>();
        params.put("file", example);
        ResponseObjFront responseObjFront;
        String frontendCompilePath = fileCompileRoot + File.separator + projectId + File.separator + SnowflakeUtil.nextId() + "/frontend.zip";
        // 确保目录存在
        try {
            Files.createDirectories(Paths.get(frontendCompilePath).getParent());
        } catch (IOException e) {
            log.info("创建目录失败: {}", e.getMessage());
            throw new RuntimeException(e);
        }
        CompileLogsEntity frontendCompileLog = new CompileLogsEntity()
                .setProjectId(projectId)
                .setOperationType(OperationTypeEnum.FRONT_COMPILE.getType());
        String responseResult = "编译失败";
        String responseCode = "500";
        String logContent = "";
        try {
            responseObjFront = WebClientUtil.postByBodyReturnObjFront(baseUrl, frontendCompileUrl, params);

            if ("200".equals(responseObjFront.getCode())) {
                // 将十六进制字符串转换为字节数组
                byte[] bytes = hexStringToByteArray(responseObjFront.getOutput_zip());
                // 将字节数组写入文件
                try (FileOutputStream fos = new FileOutputStream(frontendCompilePath)) {
                    fos.write(bytes);
                    log.info("文件已成功写入！");
                } catch (IOException e) {
                    e.printStackTrace();
                }
            } else {
                log.info("前端编译失败: {}", responseObjFront.getMessage());
                throw new BusinessException("前端编译失败");
            }

            File frontendCompileZip = new File(frontendCompilePath);
            if (!frontendCompileZip.exists()) {
                log.error("前端编译：{}， 编译文件不存在", baseUrl);
                throw new BusinessException("前端编译文件不存在");
            }
            if (!ZipUtil.checkValidZipFile(frontendCompilePath)) {
                throw new BusinessException("无效的zip文件");
            }
            // 解压编译文件
            String frontendCompileDir = Paths.get(fileCompileRoot, String.valueOf(projectId), "frontend", String.valueOf(SnowflakeUtil.nextId())) + File.separator;
            List<File> frontendCompileFiles = ZipUtil.unzipAndGetFiles(frontendCompilePath, frontendCompileDir);
            if (CollectionUtils.isEmpty(frontendCompileFiles)) {
                throw new BusinessException("前端编译文件为空");
            }
            /*// 获取拓扑文件解析网元信息
            List<FileEntity> topologyFiles = fileMapper.getByProjectIdAndFileType(projectId, FileTypeEnum.TOPOLOGY.getType());
            if (CollectionUtils.isEmpty(topologyFiles)) {
                throw new BusinessException("没有找到拓扑文件");
            }
            String topologyFilePath = topologyFiles.get(0).getFilePath();
            if (!new File(topologyFiles.get(0).getFilePath()).exists()) {
                throw new BusinessException("拓扑文件不存在，无法解析编译文件");
            }*/

            //获取项目的path.json文件
            List<FileEntity> pathFiles = fileMapper.getByProjectIdAndFileTypeAndFileName(projectId, FileTypeEnum.OTHER.getType(), "path.json");
            if (CollectionUtils.isEmpty(pathFiles)) {
                throw new BusinessException("没有找到path.json文件");
            }
            String pathFilePath = "";
            if (!CollectionUtils.isEmpty(pathFiles)) {
                pathFilePath = pathFiles.get(0).getFilePath();
            }
            if (!new File(pathFilePath).exists()) {
                throw new BusinessException("path.json文件不存在，无法解析编译文件");
            }

            //根据路径解析path.json文件中的设备名和ip对应的信息
            Map<String, String> networkElementMap = getDeviceMapByFilePath(pathFilePath);

//            Map<String, String> networkElementMap = JsonTopologyParser.parseNetElementInfo(topologyFilePath);
            if (MapUtils.isEmpty(networkElementMap)) {
                throw new BusinessException("未获取到设备名称和ip对应关系信息");
            }
            if (Objects.isNull(responseObjFront)) {
                responseObjFront = new ResponseObjFront();
//                responseObjFront.setCode("200");
//                responseObjFront.setMessage("编译成功");
            }
            responseCode = responseObjFront.getCode();
            responseResult = responseObjFront.getMessage();
            Map<String, String> compileFileMap = frontendCompileFiles.stream()
                    .filter(f -> !FileUtil.isDirectory(f))
                    .collect(Collectors.toMap(File::getName, File::getAbsolutePath));
            String networkElementName;
            String p4Name;
            String jsonName;
            List<CompileDeployRecordEntity> compileDeployRecordList = new ArrayList<>();
            for (Map.Entry<String, String> stringEntry : networkElementMap.entrySet()) {
                networkElementName = stringEntry.getKey();

                // p4文件
                p4Name = networkElementName + ".p4";
                compileDeployRecordList.add(new CompileDeployRecordEntity()
                        .setProjectId(projectId)
                        .setOperationIp(stringEntry.getValue())
                        .setOperationType(OperationTypeEnum.FRONT_COMPILE.getType())
                        .setFileType(FileEndWithTypeEnum.P4.getType())
                        .setFileName(p4Name)
                        .setFilePath(compileFileMap.get(p4Name))
                        .setRequestPath(baseUrl + frontendCompileUrl)
                        .setRequestParameter(params.toString())
                        .setResponseCode(responseObjFront.getCode())
                        .setResponseResult(responseObjFront.toString())
                        .setCreateBy(1)
                        .setUpdateBy(1)
                        .setCreateAt(today)
                        .setUpdateAt(today)
                );

                // json文件
                jsonName = networkElementName + "_entry.json";
                compileDeployRecordList.add(new CompileDeployRecordEntity()
                        .setProjectId(projectId)
                        .setOperationIp(stringEntry.getValue())
                        .setOperationType(OperationTypeEnum.FRONT_COMPILE.getType())
                        .setFileType(FileEndWithTypeEnum.JSON.getType())
                        .setFileName(jsonName)
                        .setFilePath(compileFileMap.get(jsonName))
                        .setRequestPath(baseUrl + frontendCompileUrl)
                        .setRequestParameter(params.toString())
                        .setResponseCode(responseObjFront.getCode())
                        .setResponseResult(responseObjFront.toString())
                        .setCreateBy(1)
                        .setUpdateBy(1)
                        .setCreateAt(today)
                        .setUpdateAt(today)
                );
            }
            // 编译部署记录表记录
            if (CollectionUtils.isNotEmpty(compileDeployRecordList)) {
                // 批量插入编译部署记录
                compileDeployRecordMapper.insertList(compileDeployRecordList);
                // 更新项目的output文件夹内容及记录 TODO 历史编译文件会复制到output文件夹，历史文件暂时保留
                fileService.updateFrontendCompileByProjectId(projectId, compileDeployRecordList, frontendCompileFilePath(projectId));
            }
            String logPath = "";
            String logName = "";
            for (Map.Entry<String, String> entry : compileFileMap.entrySet()) {
                if (entry.getKey().contains(".txt")) {
                    logName = entry.getKey();
                    logPath = entry.getValue();
                }
            }
            log.info("前端编译日志文件路径：{}", logPath);
            if (StringUtils.isNotBlank(logPath) && StringUtils.isNotBlank(logName) && FileUtil.existsByPath(logPath)) {
                logContent = fileStorageService.readFile(logPath);
            } else {
                //没有日志文件,直接调甲方接口
                logContent = compileFrontendLog(projectId, today);
                log.info("前端编译调用前端日志接口获取的日志信息：{}", logContent);
            }
        } catch (Exception e) {
            log.error("前端编译失败，失败原因：{}", e.getMessage());
            throw new BusinessException(String.format("前端编译失败，失败原因：%s", e.getMessage()));
        } finally {
            frontendCompileLog.setResponseCode(responseCode);
            frontendCompileLog.setResponseResult(responseResult);
            frontendCompileLog.setCompileOut(logContent);
            frontendCompileLog.setCreateAt(today);
            frontendCompileLog.setUpdateAt(today);
            // 插入日志表
            compileLogsMapper.insert(frontendCompileLog);
            // 删除压缩包
            FileUtil.deleteFile(Paths.get(frontendCompilePath).toFile());
        }
        return R.ok("前端编译日志: \n" + logContent);
    }

    /**
     * 调用甲方接口--部署
     * @param projectId 项目ID
     * @param ip 设备IP
     * @return 编译结果日志
     */
    public String remoteDeploy(Long projectId, String ip, LocalDateTime today) {
        String result = "";
        //设备ip不能为空
        if (StringUtils.isEmpty(ip)) {
            log.error("项目{}的部署，设备ip不能为空", projectId);
            throw new BusinessException("设备ip不能为空");
        }
        //先判断是否有前端编译的记录-需要获取前端最后一次编译生成的文件+ip两个参数
        List<CompileDeployRecordEntity> oneCompileRecordNewList = compileDeployRecordMapper.getOneCompileRecordNew(projectId, ip);
        if (CollectionUtils.isEmpty(oneCompileRecordNewList)) {
            log.error("项目{}的部署，没有找到前端编译记录，不能进行部署", projectId);
            throw new BusinessException("没有找到前端编译记录，不能进行部署");
        }
        //根据文件生成zip压缩包
        File file = null;
        try {
            String exportPath = fileExportRoot + "export_" + System.currentTimeMillis() + ".zip";
            ZipUtil.zipByFilePaths(oneCompileRecordNewList.stream().map(CompileDeployRecordEntity::getFilePath).collect(Collectors.toList()), exportPath);
            file = new File(exportPath);
            Map<String, Object> params = new HashMap<>();
            params.put("pne_out", file);
            // 调用部署接口
            ResponseObj responseObj = WebClientUtil.postByBodyReturnObj(HTTP_PREFIX + ip + HTTP_PORT, deployUrl, params, ResponseObj.class);
            //添加后端编译记录
            CompileDeployRecordEntity compileDeployRecordEntity = new CompileDeployRecordEntity();
            compileDeployRecordEntity.setProjectId(projectId);
            compileDeployRecordEntity.setOperationIp(ip);
            compileDeployRecordEntity.setOperationType(OperationTypeEnum.DEPLOY.getType());
            compileDeployRecordEntity.setRequestPath(HTTP_PREFIX + ip + HTTP_PORT + deployUrl);
            compileDeployRecordEntity.setRequestParameter(params.toString());
            String code = "200";
            result = "部署成功";
            if (ObjectUtils.isEmpty(responseObj)) {
                log.info("部署失败，没有返回信息");
                responseObj = new ResponseObj();
                responseObj.setCode("500");
                responseObj.setMessage("部署失败");
            }
            result = responseObj.getMessage();

            compileDeployRecordEntity.setResponseCode(responseObj.getCode());
            compileDeployRecordEntity.setResponseResult(responseObj.toString());
            compileDeployRecordEntity.setCreateBy(1);
            compileDeployRecordEntity.setUpdateBy(1);
            compileDeployRecordEntity.setCreateAt(today);
            compileDeployRecordEntity.setUpdateAt(today);
            // 插入之前,先删除原来的记录
            // deleteRecord(projectId, OperationTypeEnum.DEPLOY.getType(), ip);
            // 插入编译部署记录
            compileDeployRecordMapper.insert(compileDeployRecordEntity);
        } catch (Exception e) {
            log.error("部署失败，失败原因：{}", e.getMessage());
            throw new BusinessException(String.format("部署失败，失败原因：%s", e.getMessage()));
        } finally {
            if (Objects.nonNull(file)) {
                //删除压缩包
                FileUtil.deleteFile(file);
            }
        }
        return result;
    }

    /**
     * 调用甲方接口--后端编译
     * @param projectId 项目ID
     * @param ip 设备IP
     * @return 编译结果日志
     */
    public String remoteBackendCompile(Long projectId, String ip, LocalDateTime today) {
        String result = "";
        //设备ip不能为空
        if (ObjectUtils.isEmpty(ip)) {
            return result;
        }
        //先判断是否有部署成功的记录
        Integer deployCount = compileDeployRecordMapper.getDeployCountByProjectIdAndIp(projectId, ip);
        if (Objects.isNull(deployCount) || deployCount <= 0) {
            // 没有部署记录，则先调用部署接口
            log.info("项目{}的部署，没有找到部署记录，先调用部署接口", projectId);
            result = "部署日志: \n" + remoteDeploy(projectId, ip, today) + "\n后端编译日志为:";
        }
        //后端编译方法
        return getBackendCompileResult(projectId, ip, today, result);
    }

    /**
     * 获取后端编译结果
     */
    private String getBackendCompileResult(Long projectId, String ip, LocalDateTime today, String result) {
        //调用后端编译接口-需要获取前端最后一次编译生成的文件+ip两个参数
        List<CompileDeployRecordEntity> oneCompileRecordNewList = compileDeployRecordMapper.getOneCompileRecordNew(projectId, ip);
        if (ObjectUtils.isEmpty(oneCompileRecordNewList)) {
            return result;
        }
        //添加日志记录
        CompileLogsEntity compileLogsEntity = new CompileLogsEntity();
        compileLogsEntity.setProjectId(projectId);
        compileLogsEntity.setOperationIp(ip);
        compileLogsEntity.setOperationType(OperationTypeEnum.BACKEND_COMPILE.getType());
        compileLogsEntity.setCreateBy(1);
        compileLogsEntity.setUpdateBy(1);
        compileLogsEntity.setCreateAt(today);
        compileLogsEntity.setUpdateAt(today);
        //根据文件生成zip压缩包
        String exportPath = fileExportRoot + "export_" + System.currentTimeMillis() + ".zip";
        File file = null;
        ResponseObj responseObj = new ResponseObj();
        responseObj.setCode("200");
        responseObj.setMessage("调用后端编译接口成功");
        String resultLog = null;
        try {
            ZipUtil.zipByFilePaths(oneCompileRecordNewList.stream().map(CompileDeployRecordEntity::getFilePath).collect(Collectors.toList()), exportPath);
            file = new File(exportPath);
            Map<String, Object> params = new HashMap<>();
            params.put("pne_out", file);
            // 调用后端编译接口
            responseObj = WebClientUtil.postByBodyReturnObj(HTTP_PREFIX + ip + HTTP_PORT, backendCompileUrl, params, ResponseObj.class);
            log.info("后端编译接口返回结果：{}", responseObj.toString());
            //添加后端编译记录
            CompileDeployRecordEntity compileDeployRecordEntity = new CompileDeployRecordEntity();
            compileDeployRecordEntity.setProjectId(projectId);
            compileDeployRecordEntity.setOperationIp(ip);
            compileDeployRecordEntity.setOperationType(OperationTypeEnum.BACKEND_COMPILE.getType());
            compileDeployRecordEntity.setRequestPath(HTTP_PREFIX + ip + HTTP_PORT + backendCompileUrl);
            compileDeployRecordEntity.setRequestParameter(params.toString());

            if (Objects.isNull(responseObj)) {
                responseObj = new ResponseObj();
//                responseObj.setCode("200");
//                responseObj.setMessage("调用后端编译接口成功");
            }
            if ("200".equals(responseObj.getCode())) {
                resultLog = responseObj.getLog_content().toString();
                result += responseObj.getLog_content().toString();
            } else {
                log.info("后端编译失败，失败原因：{}", responseObj.getMessage());
                throw new BusinessException("后端编译失败");
            }
            //如果data为空,则调用甲方后端编译日志接口
            if (Objects.isNull(responseObj.getLog_content())) {
                // 调用甲方后端编译日志接口
                resultLog = compileBackendLog(projectId, ip, today);
                log.info("后端编译接口返回结果为空，调用甲方后端编译日志接口:{}", resultLog);
                result += resultLog;
            }
            compileDeployRecordEntity.setResponseResult(responseObj.toString());
            compileDeployRecordEntity.setResponseCode(responseObj.getCode());
            compileDeployRecordEntity.setCreateBy(1);
            compileDeployRecordEntity.setUpdateBy(1);
            compileDeployRecordEntity.setCreateAt(today);
            compileDeployRecordEntity.setUpdateAt(today);
            //插入之前,先删除原来的记录
            // deleteRecord(projectId, OperationTypeEnum.BACKEND_COMPILE.getType(), ip);
            // 插入编译部署记录
            compileDeployRecordMapper.insert(compileDeployRecordEntity);
        } catch (Exception e) {
            log.error("后端编译失败，失败原因：{}", e.getMessage());
            throw new BusinessException("后端编译失败，失败原因：" + e.getMessage());
        } finally {
            // 保存日志记录
            compileLogsEntity.setResponseResult(responseObj.toString());
            compileLogsEntity.setResponseCode(responseObj.getCode());
            compileLogsEntity.setCompileOut(resultLog);
            //插入之前先删除
            // deleteLog(projectId, OperationTypeEnum.BACKEND_COMPILE.getType(), ip);
            // 插入日志表
            compileLogsMapper.insert(compileLogsEntity);
            //删除压缩包
            if (Objects.nonNull(file)) {
                FileUtil.deleteFile(file);
            }
        }
        return result;
    }

    /**
     * 调用甲方接口--前端编译日志
     * @param projectId 项目ID
     * @return 前端编译日志
     */
    public String compileFrontendLog(Long projectId, LocalDateTime today) {
        String result = "前端编译日志不存在或前端编译接口调用失败";

        // 保存到日志表
        CompileLogsEntity compileLogsEntity = new CompileLogsEntity();
        compileLogsEntity.setProjectId(projectId);
        compileLogsEntity.setOperationType(OperationTypeEnum.FRONT_COMPILE.getType());
        compileLogsEntity.setCreateBy(1);
        compileLogsEntity.setUpdateBy(1);
        compileLogsEntity.setCreateAt(today);
        compileLogsEntity.setUpdateAt(today);

        // 调用远程调用工具类--前端编译日志
        ResponseObj responseObj = new ResponseObj();
        responseObj.setCode("200");
        responseObj.setMessage("调用前端编译日志接口成功");
        try {
            responseObj = WebClientUtil.getHttp(baseUrl, frontendLogUrl);
            if (Objects.isNull(responseObj)) {
                responseObj = new ResponseObj();
//                responseObj.setCode("200");
//                responseObj.setMessage("调用前端编译日志接口成功");
            }
            if ("200".equals(responseObj.getCode())) {
                result = responseObj.getLog_content().toString();
            } else {
                log.info("前端编译日志调用失败，失败原因：{}", responseObj.getMessage());
                throw new BusinessException("前端编译日志调用失败");
            }

        } catch (Exception e) {
            log.error("调用前端编译日志接口异常，失败原因：{}", e.getMessage());
            throw new BusinessException(String.format("调用前端编译日志接口异常，失败原因：%s", e.getMessage()));
        } finally {
            compileLogsEntity.setResponseResult(responseObj.toString());
            compileLogsEntity.setResponseCode(responseObj.getCode());
            compileLogsEntity.setCompileOut(result);
            //插入之前先删除
            // deleteLog(projectId, OperationTypeEnum.FRONT_COMPILE.getType(), null);
            // 插入日志表
            compileLogsMapper.insert(compileLogsEntity);
        }
        return result;
    }

    /**
     * 调用甲方接口--后端编译日志
     * @param projectId 项目ID
     * @param ip 设备ip
     * @return 后端编译日志
     */
    public String compileBackendLog(Long projectId, String ip, LocalDateTime today) throws BadRequestException, IOException {
        log.info("调用后端编译日志接口,参数projectId:{},ip:{}", projectId, ip);
        String result = "后端编译日志不存在或后端编译接口调用失败";

        if (ObjectUtils.isEmpty(projectId)) {
            throw new BadRequestException("项目id不能为空");
        }
        if (ObjectUtils.isEmpty(ip)) {
            throw new BadRequestException("设备ip不能为空");
        }

        //获取项目的path.json文件
        List<FileEntity> pathFiles = fileMapper.getByProjectIdAndFileTypeAndFileName(projectId, FileTypeEnum.OTHER.getType(), "path.json");
        if (CollectionUtils.isEmpty(pathFiles)) {
            log.info("没有找到path.json文件");
            throw new BusinessException("没有找到path.json文件");
        }
        String pathFilePath = "";
        if (!CollectionUtils.isEmpty(pathFiles)) {
            pathFilePath = pathFiles.get(0).getFilePath();
        }
        if (!new File(pathFilePath).exists()) {
            log.info("path.json文件不存在，无法解析编译文件");
            throw new BusinessException("path.json文件不存在，无法解析编译文件");
        }

        //根据路径解析path.json文件中的设备名和ip对应的信息
        Map<String, String> networkElementMap = getDeviceMapByFilePath(pathFilePath);
        log.info("path.json文件中的设备名和ip对应的信息：{}", networkElementMap.toString());

//            Map<String, String> networkElementMap = JsonTopologyParser.parseNetElementInfo(topologyFilePath);
        if (MapUtils.isEmpty(networkElementMap)) {
            throw new BusinessException("未获取到设备名称和ip对应关系信息");
        }
        log.info("获取名称之前的设备名称:{}", ip);
        String deviceName = findKeyByValue(networkElementMap, ip);
        log.info("根据ip获取到对应的设备名称：{}", deviceName);
        if (StringUtils.isEmpty(deviceName)) {
            throw new BusinessException("未获取到设备ip对应的名称信息");
        }

        // 保存到日志表
        CompileLogsEntity compileLogsEntity = new CompileLogsEntity();
        compileLogsEntity.setProjectId(projectId);
        compileLogsEntity.setOperationIp(ip);
        compileLogsEntity.setOperationType(OperationTypeEnum.BACKEND_COMPILE.getType());
        compileLogsEntity.setCreateBy(1);
        compileLogsEntity.setUpdateBy(1);
        compileLogsEntity.setCreateAt(today);
        compileLogsEntity.setUpdateAt(today);

        // 调用远程调用工具类--后端编译日志
        ResponseObj responseObj = new ResponseObj();
        responseObj.setCode("200");
        responseObj.setMessage("调用后端编译日志接口成功");
        try {
            responseObj = WebClientUtil.getHttp(HTTP_PREFIX + ip + HTTP_PORT, backendLogUrl);
            if (Objects.isNull(responseObj)) {
                responseObj = new ResponseObj();
//                responseObj.setCode("200");
//                responseObj.setMessage("调用后端编译日志接口成功");
            }
            if ("200".equals(responseObj.getCode())) {
                log.info("后端编译日志接口调用成功");
                result = responseObj.getLog_content().toString();
            } else {
                log.info("后端编译日志调用失败，失败原因：{}", responseObj.getMessage());
                throw new BusinessException("后端编译日志调用失败");
            }

        } catch (Exception e) {
            log.error("调用后端编译日志接口异常，失败原因：{}", e.getMessage());
            throw new BusinessException(String.format("调用后端编译日志接口异常，失败原因：%s", e.getMessage()));
        } finally {
            compileLogsEntity.setResponseResult(responseObj.toString());
            compileLogsEntity.setResponseCode(responseObj.getCode());
            compileLogsEntity.setCompileOut(result);
            //插入之前先删除
            // deleteLog(projectId, OperationTypeEnum.BACKEND_COMPILE.getType(), ip);
            // 插入日志表
            compileLogsMapper.insert(compileLogsEntity);
        }
        return result;
    }

    //删除记录
    public void deleteRecord(Long projectId, Integer operationType, String ip) {
        LambdaQueryWrapper<CompileDeployRecordEntity> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(CompileDeployRecordEntity::getProjectId, projectId)
                .eq(CompileDeployRecordEntity::getOperationType, operationType);

        if (!ObjectUtils.isEmpty(ip)) {
            queryWrapper.eq(CompileDeployRecordEntity::getOperationIp, ip);
        }
        compileDeployRecordMapper.delete(queryWrapper);
    }

    //删除日志
    public void deleteLog(Long projectId, Integer operationType, String ip) {
        LambdaQueryWrapper<CompileLogsEntity> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(CompileLogsEntity::getProjectId, projectId)
                .eq(CompileLogsEntity::getOperationType, operationType);

        if (!ObjectUtils.isEmpty(ip)) {
            queryWrapper.eq(CompileLogsEntity::getOperationIp, ip);
        }
        compileLogsMapper.delete(queryWrapper);
    }

    // 将十六进制字符串转换为字节数组
    private static byte[] hexStringToByteArray(String hexString) {
        int length = hexString.length();
        byte[] data = new byte[length / 2];

        for (int i = 0; i < length; i += 2) {
            int value = Integer.parseInt(hexString.substring(i, i + 2), 16);
            data[i / 2] = (byte) value;
        }
        return data;
    }

    //根据路径解析path.json文件中的设备名和ip对应的信息
    private Map<String, String> getDeviceMapByFilePath(String pathFilePath) throws IOException {
        Map<String, String> deviceMap = new HashMap<>();
        String fileContent = fileStorageService.readFile(pathFilePath);
        log.info("path.json文件内容：{}", fileContent);
        JSONObject jsonObject = new JSONObject(fileContent);
        Map<String, Object> jsonObjectMap = jsonObject.toMap();
        jsonObjectMap.forEach((key, value) -> {
            getNameIPMap(deviceMap, (Map<String, Object>) value);
        });
        return deviceMap;
    }

    private void getNameIPMap(Map<String, String> deviceMap, Map<String, Object> value) {
        value.forEach((key2, value2) -> {
            Map<String, Object> valueMap = (Map<String, Object>) value2;
            String ip = (String) valueMap.get("ip");
            if (!ObjectUtils.isEmpty(ip)) {
                deviceMap.put(key2, ip);
            }
        });
    }

    // 根据 value 查找对应的 key
    public static <K, V> K findKeyByValue(Map<K, V> map, V value) {
        for (Map.Entry<K, V> entry : map.entrySet()) {
            if (entry.getValue().equals(value)) {
                return entry.getKey();
            }
        }
        return null;  // 如果没有找到对应的 value，返回 null
    }
}
