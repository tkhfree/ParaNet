package com.citc.editor.common.util;

import org.apache.commons.lang3.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * @Description
 * @Author yzb
 * @Date 2024年12月26日
 */
public class CalUtil {

	/**
	 * 私有构造函数，防止实例化
	 */
	private CalUtil() {
		throw new UnsupportedOperationException("工具类，不允许实例化");
	}

	public static final String DEFAULT_FORMAT = "%s%%";

	/**
	 * 计算比率
	 * @param numerator 分子
	 * @param denominator 分母
	 * @param scale 保留小数位数
	 * @param format 格式化字符串，默认%
	 * @return 计算结果
	 * @author yzb
	 * @date 2024/12/26  
	 */
	public static String calRate(int numerator, int denominator, int scale, String format) {
		format = StringUtils.defaultIfBlank(format, DEFAULT_FORMAT);
		if (denominator == 0 || numerator == 0) {
			return String.format(format, 0);
		}
		BigDecimal numeratorBigDecimal = new BigDecimal(numerator);
		BigDecimal denominatorBigDecimal = new BigDecimal(denominator);
		BigDecimal result = numeratorBigDecimal
				.multiply(BigDecimal.valueOf(100))
				.divide(denominatorBigDecimal, scale, RoundingMode.HALF_UP);

		return String.format(format, result.stripTrailingZeros().toPlainString());
	}
}
