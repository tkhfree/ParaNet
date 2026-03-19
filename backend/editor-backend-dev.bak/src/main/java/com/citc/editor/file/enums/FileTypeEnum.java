package com.citc.editor.file.enums;

import java.util.Arrays;

public enum FileTypeEnum {
    //文件类型，0-拓扑，1-pne，2-其他，3-文件夹, 4-p4, 5-domain(拓扑文件命名为'topology.json',其他以json结尾的文件分配为'其他'文件类型)
    TOPOLOGY(0, "拓扑文件")
    ,PNE(1, "pne文件")
    ,OTHER(2, "其他")
    ,FOLDER(3, "文件夹")
    ,PFOUR(4, "P4文件")
    ,DOMAIN(5, "domain文件")
    ;

    private final int type;
    private final String description;

    FileTypeEnum(int type, String description) {
        this.type = type;
        this.description = description;
    }

    public int getType() {
        return type;
    }

    public String getDescription() {
        return description;
    }

    public static FileTypeEnum getEnumByType(int type) {
        return Arrays.stream(FileTypeEnum.values())
                .filter(fileTypeEnum -> fileTypeEnum.getType() == type)
                .findFirst()
                .orElse(null);
    }
}
