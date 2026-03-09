package com.citc.editor.file.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.citc.editor.common.util.SnowflakeUtil;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import lombok.Data;
import lombok.experimental.Accessors;

import java.time.LocalDateTime;
import java.util.Date;
import java.util.Objects;


/**
 * 图元信息表
 *
 * @author yjd
 * @date 2025-04-07 16:02:58
 */
@Data
@TableName("element_info")
public class ElementInfoEntity {


    /**
     * 记录ID, 通过雪花算法生成
     */
    @JsonSerialize(using = ToStringSerializer.class)
    private Long id;
    /**
     * 设备类型
     */
    private String deviceType;
    /**
     * 设备型号
     */
    private String deviceModel;
    /**
     * 图元图片
     */
    private String pictureName;
    /**
     * 图片路径
     */
    private String picturePath;
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

    public Long getId() {
        if (Objects.isNull(id)) {
            id = SnowflakeUtil.nextId();
        }
        return id;
    }

}
