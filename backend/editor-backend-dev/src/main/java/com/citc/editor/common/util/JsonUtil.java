package com.citc.editor.common.util;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JavaType;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.collect.Lists;

import java.util.List;
import java.util.Set;

public class JsonUtil {
    private static final ObjectMapper mapper = new ObjectMapper();

    public static String toJson(Object obj) throws JsonProcessingException {
        return mapper.writeValueAsString(obj);
    }

    public static String toJsonSilence(Object obj) {
        try {
            return toJson(obj);
        } catch (Exception e) {
            return "";
        }
    }

    public static <T> T fromJson(String json, Class<T> clazz) throws JsonProcessingException {
        return mapper.readValue(json, clazz);
    }

    public static <T> List<T> fromJsonList(String json, Class<T> clazz) throws JsonProcessingException {
        JavaType javaType = mapper.getTypeFactory().constructParametricType(List.class, clazz);
        return mapper.readValue(json, javaType);
    }

    public static <T> List<T> fromJsonListSilence(String json, Class<T> clazz) {
        try {
            return fromJsonList(json, clazz);
        } catch (Exception e) {
            return Lists.newArrayList();
        }
    }

    public static <T> Set<T> fromJsonSet(String json, Class<T> clazz) throws JsonProcessingException {
        JavaType javaType = mapper.getTypeFactory().constructParametricType(Set.class, clazz);
        return mapper.readValue(json, javaType);
    }
}
