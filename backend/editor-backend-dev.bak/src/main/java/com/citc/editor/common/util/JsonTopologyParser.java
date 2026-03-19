package com.citc.editor.common.util;

import com.citc.editor.common.exceptions.BusinessException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.collections4.MapUtils;
import org.springframework.util.ObjectUtils;

import java.io.File;
import java.io.IOException;
import java.util.*;

/**
 * @Description
 * @Author yzb
 * @Date 2025年04月02日
 */
@Slf4j
public class JsonTopologyParser {

	/**
	 * 拓扑结构类
	 */
	@Data
	public static class Topology {
		private String name;
		private Map<String, Node> nodes = new HashMap<>();
	}

	/**
	 * 节点类
	 */
	@Data
	public static class Node {
		private String name;
		private Map<String, Integer> next = new HashMap<>();
		private int tables;
		private String ip;
	}

	/**
	 * 从文件解析拓扑结构
	 *
	 * @param jsonFilePath JSON文件路径
	 * @return 拓扑结构映射
	 */
	public static Map<String, Topology> parseFromFile(String jsonFilePath) {
		try {
			ObjectMapper mapper = new ObjectMapper();
			JsonNode rootNode = mapper.readTree(new File(jsonFilePath));
			return parseTopologies(rootNode);
		} catch (IOException e) {
			log.error("解析JSON文件失败: {}", e.getMessage(), e);
			throw new BusinessException("解析JSON文件失败");
		}
	}

	/**
	 * 解析拓扑结构
	 *
	 * @param rootNode JSON根节点
	 * @return 拓扑结构映射
	 */
	private static Map<String, Topology> parseTopologies(JsonNode rootNode) {
		Map<String, Topology> topologies = new HashMap<>();

		Iterator<Map.Entry<String, JsonNode>> fields = rootNode.fields();
		while (fields.hasNext()) {
			Map.Entry<String, JsonNode> entry = fields.next();
			String topologyName = entry.getKey();
			JsonNode topologyNode = entry.getValue();

			Topology topology = new Topology();
			topology.setName(topologyName);

			// 解析拓扑中的节点
			Map<String, Node> nodes = new HashMap<>();
			Iterator<Map.Entry<String, JsonNode>> nodeFields = topologyNode.fields();
			while (nodeFields.hasNext()) {
				Map.Entry<String, JsonNode> nodeEntry = nodeFields.next();
				String nodeName = nodeEntry.getKey();
				JsonNode nodeData = nodeEntry.getValue();

				Node node = new Node();
				node.setName(nodeName);
				node.setTables(nodeData.get("tables").asInt());
				node.setIp(nodeData.get("ip").asText());

				// 解析下一跳信息
				Map<String, Integer> nextHops = new HashMap<>();
				JsonNode nextNode = nodeData.get("next");
				Iterator<Map.Entry<String, JsonNode>> nextFields = nextNode.fields();
				while (nextFields.hasNext()) {
					Map.Entry<String, JsonNode> nextEntry = nextFields.next();
					String nextNodeName = nextEntry.getKey();
					int weight = nextEntry.getValue().asInt();
					nextHops.put(nextNodeName, weight);
				}
				node.setNext(nextHops);
				nodes.put(nodeName, node);
			}
			topology.setNodes(nodes);
			topologies.put(topologyName, topology);
		}
		return topologies;
	}

	/**
	 * 从拓扑文件中解析网元设备信息
	 * @param topologyFilePath 拓扑文件路径
	 * @return 网络设备信息映射
	 */
	public static Map<String, String> parseNetElementInfo(String topologyFilePath) {
		try {
			Map<String, JsonTopologyParser.Topology> map = JsonTopologyParser.parseFromFile(topologyFilePath);
			if (MapUtils.isEmpty(map)) {
				throw new BusinessException("解析拓扑文件失败，解析结果为空");
			}
			Map<String, JsonTopologyParser.Node> tmpNodes;
			JsonTopologyParser.Node tmpNode;
			Map<String, String> netElementMap = new HashMap<>();
			for (Map.Entry<String, JsonTopologyParser.Topology> topologyEntry : map.entrySet()) {
				tmpNodes = topologyEntry.getValue().getNodes();
				if (MapUtils.isEmpty(tmpNodes)) {
					continue;
				}
				for (Map.Entry<String, JsonTopologyParser.Node> nodeEntry : tmpNodes.entrySet()) {
					tmpNode = nodeEntry.getValue();
					if (ObjectUtils.isEmpty(tmpNode) || netElementMap.containsKey(tmpNode.getName())) {
						continue;
					}
					netElementMap.put(tmpNode.getName(),tmpNode.getIp());
				}
			}
			return netElementMap;
		} catch (Exception e) {
			log.error("解析拓扑文件失败，失败原因：{}", e.getMessage());
			throw new BusinessException("解析拓扑文件失败");
		}
	}
}
