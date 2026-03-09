package com.citc.editor.common.util;

import com.citc.editor.common.ResponseObj;
import com.citc.editor.common.ResponseObjFront;
import com.citc.editor.common.exceptions.BusinessException;
import io.netty.handler.ssl.SslContext;
import io.netty.handler.ssl.SslContextBuilder;
import io.netty.handler.ssl.util.InsecureTrustManagerFactory;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.collections4.MapUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.poi.ss.formula.functions.T;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.netty.http.client.HttpClient;

import javax.net.ssl.SSLException;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.time.Duration;
import java.util.Map;

/**
 * @Description webClient工具类
 * @Author yzb
 * @Date 2024年11月18日
 */
@Slf4j
public class WebClientUtil {

    /**
     * 设置最大内存大小为50MB
     */
    private static final int MAX_IN_MEMORY_SIZE = 50 * 1024 * 1024;

    /**
     * 超时时间，单位：秒
     */
    private static final int TIMEOUT_SECONDS = 10;

    private WebClientUtil() {
    }

    /**
     * 获取WebClient对象，无需验证token
     *
     * @param baseUrl 请求地址前缀
     * @param token 请求头token
     * @return WebClient实例
     */
    public static WebClient getWebClient(String baseUrl, String token) {
        return getWebClient(baseUrl, token, false);
    }

    /**
     * 获取WebClient对象，支持HTTPS
     *
     * @param baseUrl 请求地址前缀
     * @param token 请求头token
     * @param skipSslValidation 是否跳过SSL证书验证
     * @return WebClient实例
     */
    public static WebClient getWebClient(String baseUrl, String token, boolean skipSslValidation) {
        WebClient.Builder builder = WebClient.builder().baseUrl(baseUrl);

        if (StringUtils.isNotBlank(token)) {
            builder.defaultHeader(HttpHeaders.AUTHORIZATION, token);
        }
        // 配置HTTP客户端，添加超时设置
        HttpClient httpClient = HttpClient.create().responseTimeout(Duration.ofSeconds(TIMEOUT_SECONDS));
        builder.codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(MAX_IN_MEMORY_SIZE));
        // 如果需要跳过SSL证书验证或者是HTTPS请求
        if (skipSslValidation || (StringUtils.isNotBlank(baseUrl) && baseUrl.toLowerCase().startsWith("https"))) {
            try {
                SslContext sslContext = SslContextBuilder
                        .forClient()
                        .trustManager(InsecureTrustManagerFactory.INSTANCE)
                        .build();
                httpClient = httpClient.secure(t -> t.sslContext(sslContext));

                builder.clientConnector(new ReactorClientHttpConnector(httpClient));
            } catch (SSLException e) {
                log.error("配置SSL上下文失败: {}", e.getMessage(), e);
                throw new BusinessException("配置SSL上下文失败");
            }
        }
        return builder.build();
    }

    /**
     * GET请求，无请求参数
     *
     * @param baseUrl      请求地址，例如：http://127.0.0.1:8080
     * @param uri          请求路径，例如：/api/v1/xxx
     * @param token        请求头token，需要验证token则必传
     * @return 返回对象，带泛型
     */
    public static <T> T get(String baseUrl, String uri, String token) {
        WebClient webClient = getWebClient(baseUrl, token);

        return webClient
                .get()
                .uri(uri)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<T>() {})
                .block();
    }

    /**
     * GET请求，带请求参数
     *
     * @param baseUrl      请求地址
     * @param uri          请求路径，例如：/api/v1/xxx
     * @param token        请求头token，需要验证token则必传
     * @param params       请求参数，可以为空
     * @return 返回对象，带泛型
     */
    public static <T> T getByParams(String baseUrl, String uri, String token, Map<String, String> params) {
        WebClient webClient = getWebClient(baseUrl, token);

        if (params.isEmpty()) {
            return webClient
                    .get()
                    .uri(uri)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<T>() {})
                    .block();
        }
        MultiValueMap<String, String> multiValueMaps = new LinkedMultiValueMap<>();
        params.forEach(multiValueMaps::add);
        return webClient
                .get()
                .uri(uri, multiValueMaps)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<T>() {})
                .block();
    }

    /**
     * GET请求，带请求参数
     *
     * @param baseUrl       请求地址
     * @param uri           请求路径，例如：/api/v1/xxx
     * @param token         请求头token，需要验证token则必传
     * @param params        请求参数，可以为空
     * @return 返回对象，带泛型
     */
    public static <T> T getByParamsReturnGenericsObj(String baseUrl, String uri, String token, Map<String, String> params) {
        WebClient webClient = getWebClient(baseUrl, token);

        if (params.isEmpty()) {
            return webClient
                    .get()
                    .uri(uri)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<T>() {})
                    .block();
        }

        // 手动构建 query 参数字符串，不进行 URL 编码
        StringBuilder uriBuilder = new StringBuilder(uri);
        boolean firstParam = true;

        for (Map.Entry<String, String> entry : params.entrySet()) {
            if (firstParam) {
                uriBuilder.append("?");
                firstParam = false;
            } else {
                uriBuilder.append("&");
            }
            uriBuilder.append(entry.getKey()).append("=").append(entry.getValue());  // 不进行编码
        }

        // 直接使用手动构建的 URI
        String finalUri = uriBuilder.toString();

        return webClient
                .get()
                .uri(finalUri)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<T>() {})
                .block();
    }

    /**
     * POST请求，带请求参数，需要带token
     *
     * @param baseUrl      请求地址
     * @param uri          请求路径，例如：/api/v1/xxx
     * @param token        请求头token
     * @param body         请求参数对象
     * @return 返回对象
     * @author yzb
     * @date 2024/11/18
     */
    public static T postByBodyValueReturnObj(String baseUrl, String uri, String token, Object body) {
        WebClient webClient = getWebClient(baseUrl, token);

        return webClient
                .post()
                .uri(uri)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(T.class)
                .block();
    }

    /**
     * POST请求，带请求参数
     *
     * @param baseUrl      请求地址
     * @param uri          请求路径，例如：/api/v1/xxx
     * @param body         请求参数对象
     * @return <T> T 返回对象类型
     * @author yzb
     * @date 2024/11/18
     */
    public static <T> T postByBodyValueReturnGenericsObj(String baseUrl, String uri, Object body) {
        WebClient webClient = getWebClient(baseUrl, "");
        return webClient
                .post()
                .uri(uri)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<T>() {})
                .block();
    }

    /**
     * POST请求，请求带文件和参数，支持多文件
     * contentType = multipart/form-data
     * @param baseUrl    请求地址，例如：http://127.0.0.1:8080
     * @param uri        请求路径，例如：/api/v1/xxx
     * @param params     参数，key为参数名，value为参数值
     * @return 对象
     * @author yzb
     * @Date 2025/03/31
     */
    public static <T> T postByBodyReturnObj(String baseUrl, String uri, Map<String, Object> params, Class<T> responseType) {
        WebClient webClient = getWebClient(baseUrl, "");
        MultipartBodyBuilder bodyBuilder = new MultipartBodyBuilder();
        // 参数处理
        if (MapUtils.isNotEmpty(params)) {
            params.forEach((key, value) -> {
                if (value instanceof File) {
                    bodyBuilder.part(key, new FileSystemResource((File) value))
                            .filename(((File) value).getName())
                            .contentType(MediaType.APPLICATION_OCTET_STREAM);
                    return;
                }
                if (value instanceof String) {
                    bodyBuilder.part(key, value);
                }
            });
        }
        return webClient.post()
                .uri(uri)
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(BodyInserters.fromMultipartData(bodyBuilder.build()))
                .header("Accept", MediaType.APPLICATION_JSON_VALUE)
                .retrieve()
                .bodyToMono(responseType)
                .doOnError(e -> {
                    log.error("请求失败: {}", e.getMessage(), e);
                    throw new BusinessException("请求失败");
                })
                .block();
    }

    /**
     * POST请求，请求带文件和参数，支持多文件
     * contentType = multipart/form-data
     * @param baseUrl    请求地址，例如：http://127.0.0.1:8080
     * @param uri        请求路径，例如：/api/v1/xxx
     * @param params     参数，key为参数名，value为参数值
     * @return 对象
     * @author yzb
     * @Date 2025/03/31
     */
    public static ResponseObjFront postByBodyReturnObjFront(String baseUrl, String uri, Map<String, Object> params) {
        WebClient webClient = getWebClient(baseUrl, "");
        MultipartBodyBuilder bodyBuilder = new MultipartBodyBuilder();
        // 参数处理
        if (MapUtils.isNotEmpty(params)) {
            params.forEach((key, value) -> {
                if (value instanceof File) {
                    bodyBuilder.part(key, new FileSystemResource((File) value))
                            .filename(((File) value).getName())
                            .contentType(MediaType.APPLICATION_OCTET_STREAM);
                    return;
                }
                if (value instanceof String) {
                    bodyBuilder.part(key, value);
                }
            });
        }
        return webClient.post()
                .uri(uri)
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(BodyInserters.fromMultipartData(bodyBuilder.build()))
                .header("Accept", "*/*")
                .retrieve()
                .bodyToMono(ResponseObjFront.class)
                .doOnError(e -> {
                    log.error("请求失败: {}", e.getMessage(), e);
                    throw new BusinessException("请求失败");
                })
                .block();
    }

    /**
     * GET请求，下载文件
     *
     * @param baseUrl    请求地址，例如：http://127.0.0.1:8080
     * @param uri        请求路径，例如：/api/v1/xxx
     * @param savePath 保存路径
     * @return 保存的文件路径
     * @author yzb
     * @Date 2025/03/31
     */
    public static String downloadFile(String baseUrl, String uri, String savePath) {
        WebClient webClient = getWebClient(baseUrl, "");
        Path path = Paths.get(savePath);

        try {
            // 确保目录存在
            Files.createDirectories(path.getParent());
            Flux<DataBuffer> dataBufferFlux = webClient.get()
                    .uri(uri)
                    .retrieve()
                    .bodyToFlux(DataBuffer.class);

            DataBufferUtils.write(dataBufferFlux, path, StandardOpenOption.CREATE)
                    .doOnError(e -> {
                        log.error("下载文件失败: {}", e.getMessage(), e);
                        throw new BusinessException("下载文件失败");
                    })
                    .block();
            return savePath;
        } catch (IOException e) {
            log.error("下载文件失败: {}", e.getMessage(), e);
            throw new BusinessException("下载文件失败");
        }
    }

    /**
     * POST请求，请求带json参数，下载响应文件
     *
     * @param baseUrl    请求地址，例如：http://127.0.0.1:8080
     * @param uri        请求路径，例如：/api/v1/xxx
     * @param json     JSON格式请求体
     * @param savePath 保存路径
     * @return 保存的文件路径
     * @author yzb
     * @Date 2025/04/01
     */
    public static String postAndDownloadFile(String baseUrl, String uri, String json, String savePath) {
        WebClient webClient = getWebClient(baseUrl, "");
        Path path = Paths.get(savePath);

        try {
            // 确保目录存在
            Files.createDirectories(path.getParent());
            Flux<DataBuffer> dataBufferFlux = webClient.post()
                    .uri(uri)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(json)
                    .retrieve()
                    .bodyToFlux(DataBuffer.class);

            DataBufferUtils.write(dataBufferFlux, path, StandardOpenOption.CREATE)
                    .doOnError(e -> {
                        log.error("POST请求下载文件失败: {}", e.getMessage(), e);
                        throw new BusinessException("POST请求下载文件失败");
                    })
                    .block();
            return savePath;
        } catch (IOException e) {
            log.error("创建文件目录失败: {}", e.getMessage(), e);
            throw new BusinessException("创建文件目录失败");
        }
    }

    /**
     * POST请求，请求带文件参数和普通参数，下载响应文件
     *
     * @param baseUrl    请求地址，例如：http://127.0.0.1:8080
     * @param uri        请求路径，例如：/api/v1/xxx
     * @param params     参数，可以有多个文件参数或者普通参数
     * @param savePath   保存路径
     * @return 保存的文件路径
     * @author yzb
     * @Date 2025/03/31
     */
    public static ResponseObj postAndDownloadFile(String baseUrl,
                                                  String uri,
                                                  Map<String, Object> params,
                                                  String savePath) {
        WebClient webClient = getWebClient(baseUrl, "");
        MultipartBodyBuilder bodyBuilder = new MultipartBodyBuilder();
        Path path = Paths.get(savePath);
        // 参数处理
        if (MapUtils.isNotEmpty(params)) {
            params.forEach((key, value) -> {
                if (value instanceof File) {
                    bodyBuilder.part(key, new FileSystemResource((File) value));
                    return;
                }
                if (value instanceof String) {
                    bodyBuilder.part(key, value);
                }
            });
        }
        try {
            // 确保目录存在
            Files.createDirectories(path.getParent());
            // 发送请求并处理响应
            return webClient.post()
                    .uri(uri)
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(BodyInserters.fromMultipartData(bodyBuilder.build()))
                    .header("Accept", MediaType.APPLICATION_JSON_VALUE)
                    .exchangeToMono(response -> {
                        if (response.statusCode().is2xxSuccessful()) {
                            String contentType = response.headers().contentType().map(MediaType::toString).orElse("");
                            if (contentType.contains("application/zip")) {
                                // 成功响应，下载ZIP文件
                                return DataBufferUtils.write(
                                        response.bodyToFlux(DataBuffer.class),
                                        path,
                                        StandardOpenOption.CREATE
                                ).then(response.bodyToMono(ResponseObj.class));
                            } else {
                                // 成功状态但不是ZIP文件，可能是JSON错误信息
                                return response.bodyToMono(ResponseObj.class);
                            }
                        } else {
                            // 失败响应，解析错误信息
                            return response.bodyToMono(ResponseObj.class);
                        }
                    })
                    .doOnError(e -> {
                        log.error("请求失败: {}", e.getMessage(), e);
                        throw new BusinessException("请求失败: " + e.getMessage());
                    })
                    .block();
        } catch (IOException e) {
            log.error("接口请求失败: {}", e.getMessage(), e);
            throw new BusinessException("接口请求失败");
        }
    }

    /**
     * GET请求，下载文件
     *
     * @param baseUrl    请求地址，例如：http://127.0.0.1:8080
     * @param uri        请求路径，例如：/api/v1/xxx
     * @param savePath 保存路径
     * @return 保存的文件路径
     * @author yzb
     * @Date 2025/03/31
     */
    public static ResponseObj getAndDownloadFile(String baseUrl, String uri, String savePath) {
        WebClient webClient = getWebClient(baseUrl, "");
        Path path = Paths.get(savePath);

        try {
            // 确保目录存在
            Files.createDirectories(path.getParent());
            return webClient.get()
                    .uri(uri)
                    .header("Accept", MediaType.APPLICATION_JSON_VALUE)
                    .exchangeToMono(response -> {
                        if (response.statusCode().is2xxSuccessful()) {
                            String contentType = response.headers().contentType().map(MediaType::toString).orElse("");
                            if (contentType.contains("application/text")) {
                                // 成功响应，下载text文件
                                return DataBufferUtils.write(
                                        response.bodyToFlux(DataBuffer.class),
                                        path,
                                        StandardOpenOption.CREATE
                                ).then(Mono.just(new ResponseObj().setCode("200").setMessage("下载成功")));
                            } else {
                                // 成功状态但不是ZIP文件，可能是JSON错误信息
                                return response.bodyToMono(ResponseObj.class);
                            }
                        } else {
                            // 失败响应，解析错误信息
                            return response.bodyToMono(ResponseObj.class);
                        }
                    })
                    .doOnError(e -> {
                        log.error("请求失败: {}", e.getMessage(), e);
                        throw new BusinessException("请求失败: " + e.getMessage());
                    })
                    .block();
        } catch (IOException e) {
            log.error("接口请求失败: {}", e.getMessage(), e);
            throw new BusinessException("接口请求失败");
        }
    }

    /**
     * GET请求，无请求参数
     *
     * @param baseUrl      请求地址，例如：http://127.0.0.1:8080
     * @param uri          请求路径，例如：/api/v1/xxx
     * @return 返回对象，带泛型
     */
    public static ResponseObj getHttp(String baseUrl, String uri) {
        WebClient webClient = getWebClient(baseUrl, "");

        return webClient
                .get()
                .uri(uri)
                .retrieve()
                .bodyToMono(ResponseObj.class)
                .block();
    }
}
