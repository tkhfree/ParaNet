package com.citc.editor.common.util;

import lombok.extern.slf4j.Slf4j;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import javax.servlet.http.HttpServletRequest;
import java.util.Objects;

/**
 * @Description
 * @Author yzb
 * @Date 2024年11月18日
 */
@Slf4j
public class RequestUtil {

    private RequestUtil(){}

    /**
     * 获取当前请求的URI
     */
    public static String getRequestUri() {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (Objects.isNull(attributes)) {
            log.warn("获取RequestAttributes失败，可能不在Web上下文中");
            return "";
        }
        HttpServletRequest request = attributes.getRequest();
        return request.getServletPath();
    }
}
