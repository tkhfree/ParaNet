package com.citc.editor.file.vo;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class CompileDeployRecordVo {

    /**
     * 记录ID, 通过雪花算法生成
     */
    @JsonSerialize(using = ToStringSerializer.class)
    private Long id;
    /**
     * 项目ID
     */
    @JsonSerialize(using = ToStringSerializer.class)
    private Long projectId;
    /**
     * 设备ip
     */
    private String operationIp;
    /**
     * 操作记录类型，1-前端编译;2部署;3-后端编译
     */
    private Integer operationType;
    /**
     * 文件类型:1-p4;2-json
     */
    private Integer fileType;
    /**
     * 文件名称
     */
    private String fileName;
    /**
     * 编译返回文件存放路径
     */
    private String filePath;
    /**
     * 网元类型:1-接入级多模态网元-7132;2-核心级多模态网元-8180;3-虚拟网元;4-Tofino芯片P4交换机;5-Behavioral Model v2
     */
    private Integer networkElementType;
    /**
     * 请求路径
     */
    private String requestPath;
    /**
     * 请求参数
     */
    private String requestParameter;
    /**
     * 响应结果
     */
    private String responseResult;
    /**
     * 响应状态码
     */
    private String responseCode;
    /**
     * 删除标记,0-正常,1-删除
     */
    private Integer deleteFlag;
    /**
     * 创建人id
     */
    private Integer createBy;
    /**
     * 修改人id
     */
    private Integer updateBy;
    /**
     * 创建时间
     */
    private LocalDateTime createAt;
    /**
     * 最后一次更新时间
     */
    private LocalDateTime updateAt;
}
