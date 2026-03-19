package com.citc.editor.file.dto;

import lombok.Data;

@Data
public class ElementInfoDto {

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
}
