package com.citc.editor.common.util;

import com.google.common.collect.Range;
import com.google.common.collect.RangeSet;
import com.google.common.collect.TreeRangeSet;
import org.apache.commons.collections4.CollectionUtils;

import java.util.List;

/**
 * @Description 系统业务相关工具类
 * @Author yzb
 * @Date 2025年01月15日
 */
public class BusUtil {
	private BusUtil() {}

	private static final String OCCUPY_U_REGEX = "^(?:([1-9]|[1-3][0-9]|4[0-2]))-([1-9]|[1-3][0-9]|4[0-2])$";

	/**
	 * 校验占用U位是否合法
	 * 这里默认occupyU 不能为空
	 * @author yzb
	 * @date 2025/1/14
	 * @return true 合法，false 非法
	 */
	public static boolean checkOccupyU(String occupyU) {
		if (Boolean.FALSE.equals(occupyU.matches(OCCUPY_U_REGEX))) {
			return false;
		}
		int left = Integer.parseInt(occupyU.split("-")[0]);
		int right = Integer.parseInt(occupyU.split("-")[1]);
		return right >= left && right <= 42;
	}

	/**
	 * U位集合合并成一个范围
	 * @param occupyUList 占用U位集合
	 *        其中每个元素的格式为“x-x”
	 * @author yzb
	 * @date 2025/1/15  
	 */
	public static RangeSet<Integer> getUsedURange(List<String> occupyUList) {
		if (CollectionUtils.isEmpty(occupyUList)) {
			return null;
		}
		RangeSet<Integer> rangeSet = TreeRangeSet.create();
		String[] tmpArr;
 		for (String occupyU : occupyUList) {
		    tmpArr =occupyU.split("-");
			int left = Integer.parseInt(tmpArr[0]);
			int right = Integer.parseInt(tmpArr[1]);
		    rangeSet.add(Range.closed(left, right));
		}
		return rangeSet;
	}
}
