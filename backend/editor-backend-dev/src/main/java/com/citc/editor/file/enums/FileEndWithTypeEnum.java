package com.citc.editor.file.enums;

import java.util.Arrays;

public enum FileEndWithTypeEnum {

    P4(1, "p4"),
    JSON(2, "json")
    ;

    private final int type;
    private final String name;

    FileEndWithTypeEnum(int type, String description) {
        this.type = type;
        this.name = description;
    }

    public int getType() {
        return type;
    }

    public String getDescription() {
        return name;
    }

    public static FileEndWithTypeEnum getEnumByType(int type) {
        return Arrays.stream(FileEndWithTypeEnum.values())
                .filter(fileTypeEnum -> fileTypeEnum.getType() == type)
                .findFirst()
                .orElse(null);
    }
}
