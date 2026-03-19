package com.citc.editor.common.util;



import com.citc.editor.common.enums.WeekEnum;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Objects;

/**
 * @Description 时间工具类
 * @Author yzb
 * @Date 2024年09月09日
 */
public class DateUtil {

    public static final String ISO_LOCAL_DATE = "yyyy-MM-dd";

    public static final String ISO_LOCAL_DATE_TIME = "yyyy-MM-dd HH:mm:ss";

    public static final String yyyyMMddHHmmss = "yyyyMMddHHmmss";

    private static final ZoneId DEFAULT_ZONE_ID = ZoneId.systemDefault();

    /**
     * 获取下一个指定星期几的日期
     *
     * @author yzb
     * @date 2024/9/18
     */
    public static LocalDate getNextWeekDay(LocalDate date, Integer dayOfWeekNum) {
        Enum<DayOfWeek> dayOfWeekEnum = WeekEnum.getDayOfWeekByNum(dayOfWeekNum);
        if (Objects.isNull(dayOfWeekEnum)) {
            throw new RuntimeException("执行时间异常");
        }
        LocalDate nextWeekday = date.with(dayOfWeekEnum.getDeclaringClass().cast(dayOfWeekEnum));
        if (nextWeekday.isBefore(date)) {
            nextWeekday = nextWeekday.plusWeeks(1);
        }
        return nextWeekday;
    }

    /**
     * 获取下一个指定月份的日期
     *
     * @author yzb
     * @date 2024/9/18
     */
    public static LocalDate getNextMonthDay(LocalDate date, Integer num) {
        LocalDate nextMontDay = date.withDayOfMonth(num);
        if (nextMontDay.isBefore(date)) {
            nextMontDay = nextMontDay.plusMonths(1);
        }
        return nextMontDay;
    }

    /**
     * LocalDateTime 转 字符串，指定日期格式
     *
     * @param localDateTime 时间
     * @param pattern       格式
     * @return String
     */
    public static String format(LocalDateTime localDateTime, String pattern) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern(pattern);
        return formatter.format(localDateTime.atZone(DEFAULT_ZONE_ID));
    }

    /**
     * 判断两个时间段是否冲突
     *
     * @param start1 第一个时间段的开始时间
     * @param end1   第一个时间段的结束时间
     * @param start2 第二个时间段的开始时间
     * @param end2   第二个时间段的结束时间
     * @return 如果时间段冲突返回true，否则返回false
     */
    public static boolean isTimeConflict(LocalDateTime start1, LocalDateTime end1,
                                         LocalDateTime start2, LocalDateTime end2) {
        // 检查时间段1的结束时间是否在时间段2的开始时间之前
        if (end1.isBefore(start2)) {
            return false;
        }
        // 检查时间段2的结束时间是否在时间段1的开始时间之前
        if (end2.isBefore(start1)) {
            return false;
        }
        // 如果以上两个条件都不满足，说明时间段有重叠，即存在冲突
        return true;
    }


}
