package com.citc.editor.common.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.DayOfWeek;
import java.time.LocalDate;

/**
 * @Description
 * @Author yzb
 * @Date 2024年08月23日
 */
@Getter
@AllArgsConstructor
public enum WeekEnum {

    Mon(1, DayOfWeek.MONDAY, "周一"),
    Tue(2, DayOfWeek.TUESDAY, "周二"),
    Wed(3, DayOfWeek.WEDNESDAY, "周三"),
    Thu(4, DayOfWeek.THURSDAY, "周四"),
    Fri(5, DayOfWeek.FRIDAY, "周五"),
    Sat(6, DayOfWeek.SATURDAY, "周六"),
    Sun(7, DayOfWeek.SUNDAY, "周日"),
    ;

    private final Integer dayOfWeekNum;

    private final Enum<DayOfWeek> dayOfWeek;

    private final String name;

    /**
     * 根据日期获取name
     * @author yzb
     * @date 2024/8/23
     */
    public static String getNameByLocalDate(LocalDate date) {
        return WeekEnum.values()[date.getDayOfWeek().getValue() - 1].getName();
    }

    public static Enum<DayOfWeek> getDayOfWeekByNum(Integer num) {
        for (WeekEnum value : values()) {
            if (value.getDayOfWeekNum().equals(num)) {
                return value.getDayOfWeek();
            }
        }
        return null;
    }
}
