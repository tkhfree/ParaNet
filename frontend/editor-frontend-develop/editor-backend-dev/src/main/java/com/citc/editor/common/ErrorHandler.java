package com.citc.editor.common;


import com.citc.editor.common.exceptions.BadRequestException;
import com.citc.editor.common.exceptions.BusinessException;
import com.citc.editor.common.exceptions.NotfoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageConversionException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Objects;

@Slf4j
@RestControllerAdvice
public class ErrorHandler {
    @ExceptionHandler(Exception.class)
    public R exceptionHandler(Exception e) {
        log.error("系统异常", e);
        return R.error("系统错误");
    }

    @ExceptionHandler(NotfoundException.class)
    public R notfoundExceptionHandler(NotfoundException e) {
        return R.error(HttpStatus.NOT_FOUND.value(), e.getMessage());
    }

    @ExceptionHandler(BadRequestException.class)
    public R badRequestExceptionHandler(BadRequestException e) {
        return R.error(HttpStatus.BAD_REQUEST.value(), e.getMessage());
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public R missingServletRequestParameterExceptionHandler(MissingServletRequestParameterException e) {
        return R.error(HttpStatus.BAD_REQUEST.value(), "缺少请求参数");
    }

    @ExceptionHandler(HttpMessageConversionException.class)
    public R httpMessageConversionExceptionHandler(HttpMessageConversionException e) {
        log.error("", e);
        return R.error(HttpStatus.BAD_REQUEST.value(), "请求参数格式不合法");
    }

    @ExceptionHandler(BusinessException.class)
    public R businessExceptionHandler(Exception e) {
        return R.error(e.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public R methodArgumentNotValidException(MethodArgumentNotValidException e) {
        /*List<ObjectError> errors = e.getBindingResult().getAllErrors();
        return R.error(errors.get(0).getDefaultMessage());*/
        if (Objects.isNull(e.getBindingResult().getFieldError())) {
            return R.error("参数未知异常");
        }
        return R.error(e.getBindingResult().getFieldError().getDefaultMessage());
    }
}
