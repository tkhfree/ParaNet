package com.citc.editor.controlplane.service;

import com.citc.editor.common.exceptions.BadRequestException;
import com.citc.editor.common.exceptions.BusinessException;
import com.citc.editor.controlplane.dto.FlowTableDeleteDto;
import com.citc.editor.controlplane.dto.FlowTableEntryDto;
import com.citc.editor.controlplane.vo.ControlPlaneDeviceVo;
import com.citc.editor.controlplane.vo.FlowTableEntryVo;
import com.citc.editor.file.service.RemoteCallService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.springframework.http.MediaType;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;
import org.springframework.web.reactive.function.client.WebClient;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ControlPlaneService {
    private final RemoteCallService remoteCallService;

    @Value("${file.storage.root}")
    private String fileStorageRoot;

    @Value("${p4runtime.adapter.enabled:false}")
    private Boolean p4runtimeAdapterEnabled;

    @Value("${p4runtime.adapter.base-url:}")
    private String p4runtimeBaseUrl;

    @Value("${p4runtime.adapter.read-path:/p4runtime/table-entry/read}")
    private String p4runtimeReadPath;

    @Value("${p4runtime.adapter.write-path:/p4runtime/table-entry/write}")
    private String p4runtimeWritePath;

    @Value("${p4runtime.adapter.default-device-id:1}")
    private Long p4runtimeDefaultDeviceId;

    @Value("${p4runtime.adapter.election-id-high:0}")
    private Long p4runtimeElectionIdHigh;

    @Value("${p4runtime.adapter.election-id-low:1}")
    private Long p4runtimeElectionIdLow;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public List<ControlPlaneDeviceVo> listDevices(Long projectId) throws IOException, BadRequestException {
        validateProjectId(projectId);
        Map<String, String> devices = remoteCallService.getProjectDeviceMap(projectId);
        Map<String, List<FlowTableEntryVo>> store = isP4RuntimeModeEnabled() ? Collections.emptyMap() : readStore(projectId);

        return devices.entrySet().stream()
                .map(entry -> new ControlPlaneDeviceVo()
                        .setDeviceName(entry.getKey())
                        .setIp(entry.getValue())
                        .setFlowCount(resolveFlowCount(projectId, entry.getKey(), store)))
                .sorted(Comparator.comparing(ControlPlaneDeviceVo::getDeviceName))
                .collect(Collectors.toList());
    }

    public List<FlowTableEntryVo> listFlowTable(Long projectId, String deviceName) throws IOException, BadRequestException {
        validateProjectId(projectId);
        validateDeviceName(deviceName);
        validateDeviceExists(projectId, deviceName);

        if (isP4RuntimeModeEnabled()) {
            return readFlowTableFromP4Runtime(projectId, deviceName);
        }

        Map<String, List<FlowTableEntryVo>> store = readStore(projectId);
        List<FlowTableEntryVo> entries = store.getOrDefault(deviceName.trim(), new ArrayList<>());
        return entries.stream()
                .sorted(Comparator.comparing(
                        (FlowTableEntryVo item) -> item.getPriority() == null ? 0 : item.getPriority()
                ).reversed())
                .collect(Collectors.toList());
    }

    public FlowTableEntryVo saveFlowTable(Long projectId, FlowTableEntryDto dto) throws IOException, BadRequestException {
        validateProjectId(projectId);
        validateSaveDto(dto);
        String deviceName = dto.getDeviceName().trim();
        validateDeviceExists(projectId, deviceName);

        if (isP4RuntimeModeEnabled()) {
            return writeFlowTableToP4Runtime(projectId, dto,
                    StringUtils.isBlank(dto.getId()) ? "INSERT" : "MODIFY");
        }

        Map<String, List<FlowTableEntryVo>> store = readStore(projectId);
        List<FlowTableEntryVo> entries = new ArrayList<>(store.getOrDefault(deviceName, new ArrayList<>()));

        FlowTableEntryVo target = null;
        if (StringUtils.isNotBlank(dto.getId())) {
            for (FlowTableEntryVo item : entries) {
                if (dto.getId().trim().equals(item.getId())) {
                    target = item;
                    break;
                }
            }
        }

        if (target == null) {
            target = new FlowTableEntryVo().setId(UUID.randomUUID().toString());
            entries.add(target);
        }

        target.setTableId(StringUtils.defaultIfBlank(dto.getTableId(), "0").trim());
        target.setPriority(dto.getPriority() == null ? 100 : dto.getPriority());
        target.setMatchRule(normalizeMatchRuleFromDto(dto));
        target.setAction(normalizeActionTextFromDto(dto));
        target.setEnabled(dto.getEnabled() == null ? Boolean.TRUE : dto.getEnabled());
        target.setPacketCount(dto.getPacketCount() == null ? 0L : dto.getPacketCount());
        target.setByteCount(dto.getByteCount() == null ? 0L : dto.getByteCount());
        target.setRemark(StringUtils.defaultString(dto.getRemark()).trim());
        target.setUpdatedAt(LocalDateTime.now().toString());
        target.setDeviceIp(resolveDeviceIp(projectId, deviceName));
        target.setActionName(normalizeActionNameFromDto(dto));
        target.setActionParams(normalizeActionParamsFromDto(dto));
        target.setMatchFields(normalizeMatchFieldsFromDto(dto));

        store.put(deviceName, entries);
        writeStore(projectId, store);
        return target;
    }

    public void deleteFlowTable(Long projectId, FlowTableDeleteDto dto) throws IOException, BadRequestException {
        validateProjectId(projectId);
        if (dto == null || StringUtils.isBlank(dto.getId())) {
            throw new BadRequestException("流表记录 id 不能为空");
        }
        validateDeviceName(dto.getDeviceName());
        String deviceName = dto.getDeviceName().trim();
        validateDeviceExists(projectId, deviceName);

        if (isP4RuntimeModeEnabled()) {
            FlowTableEntryVo target = findFlowTableEntry(projectId, deviceName, dto.getId().trim());
            invokeP4RuntimeWrite(buildP4RuntimeWritePayload(projectId, deviceName, target, "DELETE"));
            return;
        }

        Map<String, List<FlowTableEntryVo>> store = readStore(projectId);
        List<FlowTableEntryVo> entries = new ArrayList<>(store.getOrDefault(deviceName, new ArrayList<>()));
        boolean removed = entries.removeIf(item -> dto.getId().trim().equals(item.getId()));
        if (!removed) {
            throw new BadRequestException("未找到对应的流表记录");
        }
        store.put(deviceName, entries);
        writeStore(projectId, store);
    }

    public FlowTableEntryVo toggleFlowTable(Long projectId, FlowTableDeleteDto dto, boolean enabled) throws IOException, BadRequestException {
        validateProjectId(projectId);
        if (dto == null || StringUtils.isBlank(dto.getId())) {
            throw new BadRequestException("流表记录 id 不能为空");
        }
        validateDeviceName(dto.getDeviceName());
        String deviceName = dto.getDeviceName().trim();
        validateDeviceExists(projectId, deviceName);

        if (isP4RuntimeModeEnabled()) {
            FlowTableEntryVo target = findFlowTableEntry(projectId, deviceName, dto.getId().trim());
            target.setEnabled(enabled);
            target.setUpdatedAt(LocalDateTime.now().toString());
            invokeP4RuntimeWrite(buildP4RuntimeWritePayload(projectId, deviceName, target, "MODIFY"));
            return target;
        }

        Map<String, List<FlowTableEntryVo>> store = readStore(projectId);
        List<FlowTableEntryVo> entries = new ArrayList<>(store.getOrDefault(deviceName, new ArrayList<>()));
        FlowTableEntryVo target = null;
        for (FlowTableEntryVo item : entries) {
            if (dto.getId().trim().equals(item.getId())) {
                target = item;
                break;
            }
        }
        if (target == null) {
            throw new BadRequestException("未找到对应的流表记录");
        }
        target.setEnabled(enabled);
        target.setUpdatedAt(LocalDateTime.now().toString());
        store.put(deviceName, entries);
        writeStore(projectId, store);
        return target;
    }

    private void validateSaveDto(FlowTableEntryDto dto) throws BadRequestException {
        if (dto == null) {
            throw new BadRequestException("流表数据不能为空");
        }
        validateDeviceName(dto.getDeviceName());
        if (CollectionUtils.isEmpty(normalizeMatchFieldsFromDto(dto))
                && StringUtils.isBlank(StringUtils.trimToEmpty(dto.getMatchRule()))) {
            throw new BadRequestException("matchRule 不能为空");
        }
        if (StringUtils.isBlank(normalizeActionNameFromDto(dto))
                && StringUtils.isBlank(StringUtils.trimToEmpty(dto.getAction()))) {
            throw new BadRequestException("action 不能为空");
        }
    }

    private void validateDeviceName(String deviceName) throws BadRequestException {
        if (StringUtils.isBlank(deviceName)) {
            throw new BadRequestException("deviceName 不能为空");
        }
    }

    private void validateProjectId(Long projectId) throws BadRequestException {
        if (projectId == null) {
            throw new BadRequestException("projectId 不能为空");
        }
    }

    private void validateDeviceExists(Long projectId, String deviceName) throws IOException, BadRequestException {
        Map<String, String> devices = remoteCallService.getProjectDeviceMap(projectId);
        if (!devices.containsKey(deviceName.trim())) {
            throw new BadRequestException("当前项目中不存在该网元：" + deviceName);
        }
    }

    private int resolveFlowCount(Long projectId, String deviceName, Map<String, List<FlowTableEntryVo>> store) {
        if (!isP4RuntimeModeEnabled()) {
            return store.getOrDefault(deviceName, new ArrayList<>()).size();
        }
        try {
            return readFlowTableFromP4Runtime(projectId, deviceName).size();
        } catch (Exception exception) {
            log.warn("读取 P4Runtime 流表数量失败，projectId={}, deviceName={}", projectId, deviceName, exception);
            return 0;
        }
    }

    private boolean isP4RuntimeModeEnabled() {
        return Boolean.TRUE.equals(p4runtimeAdapterEnabled) && StringUtils.isNotBlank(p4runtimeBaseUrl);
    }

    private FlowTableEntryVo writeFlowTableToP4Runtime(Long projectId, FlowTableEntryDto dto, String operation)
            throws IOException, BadRequestException {
        String actionText = normalizeActionTextFromDto(dto);
        String matchRule = normalizeMatchRuleFromDto(dto);
        FlowTableEntryVo target = new FlowTableEntryVo()
                .setId(StringUtils.defaultIfBlank(dto.getId(), buildEntryId(
                        StringUtils.defaultIfBlank(dto.getTableId(), "0"),
                        dto.getPriority(),
                        matchRule,
                        actionText)))
                .setTableId(StringUtils.defaultIfBlank(dto.getTableId(), "0").trim())
                .setPriority(dto.getPriority() == null ? 100 : dto.getPriority())
                .setMatchRule(matchRule)
                .setAction(actionText)
                .setEnabled(dto.getEnabled() == null ? Boolean.TRUE : dto.getEnabled())
                .setPacketCount(dto.getPacketCount() == null ? 0L : dto.getPacketCount())
                .setByteCount(dto.getByteCount() == null ? 0L : dto.getByteCount())
                .setRemark(StringUtils.defaultString(dto.getRemark()).trim())
                .setUpdatedAt(LocalDateTime.now().toString())
                .setMatchFields(normalizeMatchFieldsFromDto(dto))
                .setActionName(normalizeActionNameFromDto(dto))
                .setActionParams(normalizeActionParamsFromDto(dto));
        target.setDeviceIp(resolveDeviceIp(projectId, dto.getDeviceName().trim()));
        invokeP4RuntimeWrite(buildP4RuntimeWritePayload(projectId, dto.getDeviceName().trim(), target, operation));
        return target;
    }

    private FlowTableEntryVo findFlowTableEntry(Long projectId, String deviceName, String id)
            throws IOException, BadRequestException {
        return listFlowTable(projectId, deviceName).stream()
                .filter(item -> Objects.equals(item.getId(), id))
                .findFirst()
                .orElseThrow(() -> new BadRequestException("未找到对应的流表记录"));
    }

    private List<FlowTableEntryVo> readFlowTableFromP4Runtime(Long projectId, String deviceName)
            throws IOException, BadRequestException {
        Object response = invokeP4RuntimeRead(buildP4RuntimeReadPayload(projectId, deviceName));
        List<Map<String, Object>> entries = extractResponseEntries(response);
        List<FlowTableEntryVo> result = new ArrayList<>();
        String deviceIp = resolveDeviceIp(projectId, deviceName);

        for (Map<String, Object> entryWrapper : entries) {
            Map<String, Object> entry = extractTableEntry(entryWrapper);
            List<Map<String, Object>> matchFields = normalizeMapList(
                    firstNotNull(entry.get("matchFields"), entry.get("match_fields"), entry.get("matches"), entry.get("match")));
            Map<String, Object> action = asMap(firstNotNull(entry.get("action"), entry.get("tableAction"), entry.get("table_action")));
            List<Map<String, Object>> actionParams = normalizeMapList(
                    firstNotNull(action.get("params"), action.get("actionParams"), action.get("action_params")));
            Map<String, Object> counterData = asMap(firstNotNull(
                    entry.get("counterData"), entry.get("counter_data"), entry.get("counters")));
            Map<String, Object> metadata = asMap(entry.get("metadata"));

            String tableId = StringUtils.defaultIfBlank(readString(entry, "tableId", "table_id", "tableName", "table_name"), "0");
            Integer priority = readInteger(entry, "priority");
            String matchRule = formatMatchRule(matchFields);
            String actionText = formatAction(action, actionParams);

            FlowTableEntryVo item = new FlowTableEntryVo()
                    .setId(StringUtils.defaultIfBlank(readString(metadata, "id"), buildEntryId(tableId, priority, matchRule, actionText)))
                    .setTableId(tableId)
                    .setPriority(priority == null ? 0 : priority)
                    .setMatchRule(matchRule)
                    .setAction(actionText)
                    .setEnabled(readBoolean(firstNotNull(entry.get("enabled"), metadata.get("enabled")), true))
                    .setPacketCount(readLong(counterData, "packetCount", "packet_count", "packets"))
                    .setByteCount(readLong(counterData, "byteCount", "byte_count", "bytes"))
                    .setRemark(readString(metadata, "remark", "description"))
                    .setUpdatedAt(StringUtils.defaultIfBlank(readString(metadata, "updatedAt", "updated_at"), LocalDateTime.now().toString()))
                    .setDeviceIp(deviceIp)
                    .setActionName(readString(action, "actionName", "action_name", "name"))
                    .setActionParams(actionParams)
                    .setMatchFields(matchFields);
            result.add(item);
        }

        return result.stream()
                .sorted(Comparator.comparing(
                        (FlowTableEntryVo item) -> item.getPriority() == null ? 0 : item.getPriority()
                ).reversed())
                .collect(Collectors.toList());
    }

    private Map<String, Object> buildP4RuntimeReadPayload(Long projectId, String deviceName)
            throws IOException, BadRequestException {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("projectId", projectId);
        payload.put("deviceName", deviceName);
        payload.put("deviceIp", resolveDeviceIp(projectId, deviceName));
        payload.put("entityType", "table_entry");
        payload.put("p4runtime", buildP4RuntimeContext());
        return payload;
    }

    private Map<String, Object> buildP4RuntimeWritePayload(Long projectId, String deviceName, FlowTableEntryVo entry, String operation)
            throws IOException, BadRequestException {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("operation", operation);
        payload.put("projectId", projectId);
        payload.put("deviceName", deviceName);
        payload.put("deviceIp", resolveDeviceIp(projectId, deviceName));
        payload.put("entityType", "table_entry");
        payload.put("p4runtime", buildP4RuntimeContext());

        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("id", entry.getId());
        metadata.put("remark", entry.getRemark());
        metadata.put("updatedAt", entry.getUpdatedAt());
        metadata.put("enabled", entry.getEnabled());

        Map<String, Object> counterData = new LinkedHashMap<>();
        counterData.put("packetCount", entry.getPacketCount());
        counterData.put("byteCount", entry.getByteCount());

        Map<String, Object> action = new LinkedHashMap<>();
        action.put("actionName", StringUtils.defaultIfBlank(entry.getActionName(), parseActionName(entry.getAction())));
        action.put("params", entry.getActionParams() == null ? parseActionParams(entry.getAction()) : entry.getActionParams());

        Map<String, Object> tableEntry = new LinkedHashMap<>();
        tableEntry.put("tableId", StringUtils.defaultIfBlank(entry.getTableId(), "0"));
        tableEntry.put("priority", entry.getPriority() == null ? 100 : entry.getPriority());
        tableEntry.put("matchFields", entry.getMatchFields() == null ? parseMatchFields(entry.getMatchRule()) : entry.getMatchFields());
        tableEntry.put("action", action);
        tableEntry.put("counterData", counterData);
        tableEntry.put("metadata", metadata);

        payload.put("tableEntry", tableEntry);
        return payload;
    }

    private Map<String, Object> buildP4RuntimeContext() {
        Map<String, Object> context = new LinkedHashMap<>();
        context.put("deviceId", p4runtimeDefaultDeviceId);
        Map<String, Object> electionId = new LinkedHashMap<>();
        electionId.put("high", p4runtimeElectionIdHigh);
        electionId.put("low", p4runtimeElectionIdLow);
        context.put("electionId", electionId);
        return context;
    }

    private Object invokeP4RuntimeRead(Map<String, Object> payload) {
        try {
            return createP4RuntimeClient()
                    .post()
                    .uri(p4runtimeReadPath)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(payload)
                    .retrieve()
                    .bodyToMono(Object.class)
                    .block();
        } catch (Exception exception) {
            log.error("调用 P4Runtime 读流表接口失败，payload={}", payload, exception);
            throw new BusinessException("调用 P4Runtime 读流表接口失败");
        }
    }

    private Object invokeP4RuntimeWrite(Map<String, Object> payload) {
        try {
            return createP4RuntimeClient()
                    .post()
                    .uri(p4runtimeWritePath)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(payload)
                    .retrieve()
                    .bodyToMono(Object.class)
                    .block();
        } catch (Exception exception) {
            log.error("调用 P4Runtime 写流表接口失败，payload={}", payload, exception);
            throw new BusinessException("调用 P4Runtime 写流表接口失败");
        }
    }

    private WebClient createP4RuntimeClient() {
        return WebClient.builder()
                .baseUrl(p4runtimeBaseUrl.trim())
                .build();
    }

    private String resolveDeviceIp(Long projectId, String deviceName) throws IOException, BadRequestException {
        Map<String, String> devices = remoteCallService.getProjectDeviceMap(projectId);
        String ip = devices.get(deviceName.trim());
        if (StringUtils.isBlank(ip)) {
            throw new BadRequestException("未找到网元对应的 IP：" + deviceName);
        }
        return ip.trim();
    }

    private List<Map<String, Object>> extractResponseEntries(Object response) {
        Object payload = response;
        if (payload instanceof Map) {
            Map<String, Object> map = asMap(payload);
            payload = firstNotNull(map.get("data"), map.get("entries"), map.get("entities"), map.get("records"));
        }
        return normalizeMapList(payload);
    }

    private Map<String, Object> extractTableEntry(Map<String, Object> wrapper) {
        return asMap(firstNotNull(wrapper.get("tableEntry"), wrapper.get("table_entry"), wrapper));
    }

    private List<Map<String, Object>> normalizeMapList(Object value) {
        if (!(value instanceof List)) {
            return new ArrayList<>();
        }
        List<?> items = (List<?>) value;
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object item : items) {
            result.add(asMap(item));
        }
        return result;
    }

    private Map<String, Object> asMap(Object value) {
        if (value instanceof Map) {
            Map<?, ?> source = (Map<?, ?>) value;
            Map<String, Object> result = new LinkedHashMap<>();
            source.forEach((key, mapValue) -> result.put(String.valueOf(key), mapValue));
            return result;
        }
        return new LinkedHashMap<>();
    }

    private Object firstNotNull(Object... values) {
        for (Object value : values) {
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    private String readString(Map<String, Object> map, String... keys) {
        for (String key : keys) {
            Object value = map.get(key);
            if (value != null && StringUtils.isNotBlank(String.valueOf(value))) {
                return String.valueOf(value);
            }
        }
        return "";
    }

    private Integer readInteger(Map<String, Object> map, String... keys) {
        String value = readString(map, keys);
        if (StringUtils.isBlank(value)) {
            return null;
        }
        try {
            return Integer.valueOf(value);
        } catch (Exception exception) {
            return null;
        }
    }

    private Long readLong(Map<String, Object> map, String... keys) {
        String value = readString(map, keys);
        if (StringUtils.isBlank(value)) {
            return 0L;
        }
        try {
            return Long.valueOf(value);
        } catch (Exception exception) {
            return 0L;
        }
    }

    private Boolean readBoolean(Object value, boolean defaultValue) {
        if (value == null) {
            return defaultValue;
        }
        if (value instanceof Boolean) {
            return (Boolean) value;
        }
        return Boolean.valueOf(String.valueOf(value));
    }

    private String formatMatchRule(List<Map<String, Object>> matchFields) {
        if (matchFields.isEmpty()) {
            return "";
        }
        return matchFields.stream()
                .map(item -> {
                    String fieldName = readString(item, "fieldName", "field_name", "name");
                    String value = readString(item, "value");
                    String mask = readString(item, "mask", "prefixLen", "prefix_len");
                    if (StringUtils.isNotBlank(mask) && !StringUtils.equals(mask, value)) {
                        return fieldName + "=" + value + "/" + mask;
                    }
                    return fieldName + "=" + value;
                })
                .filter(StringUtils::isNotBlank)
                .collect(Collectors.joining(", "));
    }

    private String formatAction(Map<String, Object> action, List<Map<String, Object>> actionParams) {
        String actionName = readString(action, "actionName", "action_name", "name");
        if (StringUtils.isBlank(actionName)) {
            actionName = "unknown_action";
        }
        if (actionParams.isEmpty()) {
            return actionName;
        }
        String params = actionParams.stream()
                .map(item -> {
                    String paramName = readString(item, "paramName", "param_name", "name");
                    String value = readString(item, "value");
                    return StringUtils.isNotBlank(paramName) ? paramName + "=" + value : value;
                })
                .collect(Collectors.joining(", "));
        return actionName + "(" + params + ")";
    }

    private List<Map<String, Object>> parseMatchFields(String matchRule) {
        List<Map<String, Object>> fields = new ArrayList<>();
        if (StringUtils.isBlank(matchRule)) {
            return fields;
        }
        String[] parts = matchRule.split(",");
        for (String part : parts) {
            String trimmed = part.trim();
            if (StringUtils.isBlank(trimmed)) {
                continue;
            }
            String[] kv = trimmed.split("=", 2);
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("matchType", "EXACT");
            if (kv.length == 2) {
                item.put("fieldName", kv[0].trim());
                String value = kv[1].trim();
                if (value.contains("/")) {
                    String[] valueAndMask = value.split("/", 2);
                    item.put("value", valueAndMask[0].trim());
                    item.put("mask", valueAndMask[1].trim());
                    item.put("matchType", "LPM");
                } else {
                    item.put("value", value);
                }
            } else {
                item.put("fieldName", trimmed);
                item.put("value", "");
            }
            fields.add(item);
        }
        return fields;
    }

    private List<Map<String, Object>> normalizeMatchFieldsFromDto(FlowTableEntryDto dto) {
        if (dto == null) {
            return new ArrayList<>();
        }
        List<Map<String, Object>> fromDto = normalizeMapList(dto.getMatchFields());
        if (!fromDto.isEmpty()) {
            return fromDto.stream()
                    .map(item -> {
                        Map<String, Object> normalized = new LinkedHashMap<>();
                        normalized.put("fieldName", readString(item, "fieldName", "field_name", "name"));
                        normalized.put("matchType", StringUtils.defaultIfBlank(
                                readString(item, "matchType", "match_type"), "EXACT"));
                        normalized.put("value", readString(item, "value"));
                        String mask = readString(item, "mask", "prefixLen", "prefix_len");
                        if (StringUtils.isNotBlank(mask)) {
                            normalized.put("mask", mask);
                        }
                        return normalized;
                    })
                    .filter(item -> StringUtils.isNotBlank(String.valueOf(item.get("fieldName")))
                            && StringUtils.isNotBlank(String.valueOf(item.get("value"))))
                    .collect(Collectors.toList());
        }
        return parseMatchFields(dto.getMatchRule());
    }

    private String parseActionName(String actionText) {
        if (StringUtils.isBlank(actionText)) {
            return "unknown_action";
        }
        String trimmed = actionText.trim();
        int leftIndex = trimmed.indexOf('(');
        if (leftIndex > 0) {
            return trimmed.substring(0, leftIndex).trim();
        }
        int colonIndex = trimmed.indexOf(':');
        if (colonIndex > 0) {
            return trimmed.substring(0, colonIndex).trim();
        }
        return trimmed;
    }

    private List<Map<String, Object>> parseActionParams(String actionText) {
        List<Map<String, Object>> params = new ArrayList<>();
        if (StringUtils.isBlank(actionText)) {
            return params;
        }
        String trimmed = actionText.trim();
        int leftIndex = trimmed.indexOf('(');
        int rightIndex = trimmed.lastIndexOf(')');
        String rawParams = "";
        if (leftIndex > 0 && rightIndex > leftIndex) {
            rawParams = trimmed.substring(leftIndex + 1, rightIndex);
        } else {
            int colonIndex = trimmed.indexOf(':');
            if (colonIndex > 0 && colonIndex < trimmed.length() - 1) {
                rawParams = trimmed.substring(colonIndex + 1);
            }
        }
        if (StringUtils.isBlank(rawParams)) {
            return params;
        }
        String[] parts = rawParams.split(",");
        for (int i = 0; i < parts.length; i++) {
            String part = parts[i].trim();
            if (StringUtils.isBlank(part)) {
                continue;
            }
            String[] kv = part.split("=", 2);
            Map<String, Object> item = new LinkedHashMap<>();
            if (kv.length == 2) {
                item.put("paramName", kv[0].trim());
                item.put("value", kv[1].trim());
            } else {
                item.put("paramName", "param" + (i + 1));
                item.put("value", part);
            }
            params.add(item);
        }
        return params;
    }

    private String normalizeActionNameFromDto(FlowTableEntryDto dto) {
        if (dto == null) {
            return "";
        }
        if (StringUtils.isNotBlank(dto.getActionName())) {
            return dto.getActionName().trim();
        }
        return parseActionName(dto.getAction());
    }

    private List<Map<String, Object>> normalizeActionParamsFromDto(FlowTableEntryDto dto) {
        if (dto == null) {
            return new ArrayList<>();
        }
        List<Map<String, Object>> fromDto = normalizeMapList(dto.getActionParams());
        if (!fromDto.isEmpty()) {
            return fromDto.stream()
                    .map(item -> {
                        Map<String, Object> normalized = new LinkedHashMap<>();
                        normalized.put("paramName", readString(item, "paramName", "param_name", "name"));
                        normalized.put("value", readString(item, "value"));
                        return normalized;
                    })
                    .filter(item -> StringUtils.isNotBlank(String.valueOf(item.get("paramName")))
                            && StringUtils.isNotBlank(String.valueOf(item.get("value"))))
                    .collect(Collectors.toList());
        }
        return parseActionParams(dto.getAction());
    }

    private String normalizeActionTextFromDto(FlowTableEntryDto dto) {
        if (dto == null) {
            return "";
        }
        String actionName = normalizeActionNameFromDto(dto);
        List<Map<String, Object>> params = normalizeActionParamsFromDto(dto);
        if (StringUtils.isBlank(actionName)) {
            return StringUtils.defaultString(dto.getAction()).trim();
        }
        if (params.isEmpty()) {
            return actionName;
        }
        return formatAction(new LinkedHashMap<String, Object>() {{
            put("actionName", actionName);
        }}, params);
    }

    private String normalizeMatchRuleFromDto(FlowTableEntryDto dto) {
        if (dto == null) {
            return "";
        }
        List<Map<String, Object>> matchFields = normalizeMatchFieldsFromDto(dto);
        if (!matchFields.isEmpty()) {
            return formatMatchRule(matchFields);
        }
        return StringUtils.defaultString(dto.getMatchRule()).trim();
    }

    private String buildEntryId(String tableId, Integer priority, String matchRule, String action) {
        String seed = String.join("|", new LinkedHashSet<>(java.util.Arrays.asList(
                StringUtils.defaultString(tableId),
                String.valueOf(priority == null ? 0 : priority),
                StringUtils.defaultString(matchRule),
                StringUtils.defaultString(action)
        )));
        return UUID.nameUUIDFromBytes(seed.getBytes(StandardCharsets.UTF_8)).toString();
    }

    private Map<String, List<FlowTableEntryVo>> readStore(Long projectId) throws IOException {
        Path storePath = buildStorePath(projectId);
        if (!Files.exists(storePath)) {
            return new LinkedHashMap<>();
        }
        String content = new String(Files.readAllBytes(storePath), StandardCharsets.UTF_8);
        if (StringUtils.isBlank(content)) {
            return new LinkedHashMap<>();
        }
        try {
            return objectMapper.readValue(content, new TypeReference<Map<String, List<FlowTableEntryVo>>>() {});
        } catch (Exception exception) {
            log.error("读取控制面流表文件失败，projectId={}", projectId, exception);
            throw new BusinessException("读取控制面流表数据失败");
        }
    }

    private void writeStore(Long projectId, Map<String, List<FlowTableEntryVo>> store) throws IOException {
        Path storePath = buildStorePath(projectId);
        Files.createDirectories(storePath.getParent());
        objectMapper.writerWithDefaultPrettyPrinter().writeValue(storePath.toFile(), store);
    }

    private Path buildStorePath(Long projectId) {
        return Paths.get(fileStorageRoot, String.valueOf(projectId), "control_plane_flow_tables.json");
    }
}
