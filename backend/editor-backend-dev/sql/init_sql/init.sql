CREATE TABLE `editor_file` (
  `id` bigint(20) NOT NULL COMMENT '项目ID, 通过雪花算法生成',
  `file_name` varchar(200) NOT NULL DEFAULT '' COMMENT '文件名称',
  `is_folder` int(11) NOT NULL COMMENT '是否为文件夹，0-否，1-是',
  `file_type` int(11) NOT NULL COMMENT '文件类型，0-拓扑，1-pne，2-其他，3-文件夹, 4-p4, 5-domain',
  `project_id` bigint(20) NOT NULL COMMENT '项目ID',
  `parent_id` bigint(20) DEFAULT NULL COMMENT '父文件夹ID',
  `remark` varchar(500) DEFAULT '' COMMENT '备注',
  `file_path` varchar(500) NOT NULL DEFAULT '' COMMENT '路径',
  `delete_flag` tinyint(4) NOT NULL DEFAULT '0' COMMENT '删除标记,0-正常,1-删除',
  `create_by` int(11) NOT NULL DEFAULT '1' COMMENT '创建人id',
  `update_by` int(11) NOT NULL DEFAULT '1' COMMENT '修改人id',
  `create_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后一次更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='文件表';


CREATE TABLE `editor_project` (
  `id` bigint(20) NOT NULL COMMENT '项目ID, 通过雪花算法生成',
  `name` varchar(200) NOT NULL DEFAULT '' COMMENT '项目名称',
  `remark` varchar(500) NOT NULL DEFAULT '' COMMENT '备注',
  `delete_flag` tinyint(4) NOT NULL DEFAULT '0' COMMENT '删除标记,0-正常,1-删除',
  `create_by` int(11) NOT NULL DEFAULT '1' COMMENT '创建人id',
  `update_by` int(11) NOT NULL DEFAULT '1' COMMENT '修改人id',
  `create_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后一次更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='项目表';


CREATE TABLE `compile_deploy_record` (
  `id` bigint(20) NOT NULL COMMENT '记录ID, 通过雪花算法生成',
  `project_id` bigint(20) NOT NULL COMMENT '项目ID',
  `operation_ip` varchar(100) DEFAULT '' COMMENT '设备ip',
  `operation_type` tinyint(4) NOT NULL COMMENT '操作记录类型，1-前端编译;2部署;3-后端编译',
  `file_type` tinyint(4) DEFAULT NULL COMMENT '文件类型:1-p4;2-json',
  `file_name` varchar(200) DEFAULT NULL COMMENT '文件名称',
  `file_path` varchar(500) DEFAULT '' COMMENT '编译返回文件存放路径',
  `network_element_type` tinyint(4) DEFAULT NULL COMMENT '网元类型:1-接入级多模态网元-7132;2-核心级多模态网元-8180;3-虚拟网元;4-Tofino芯片P4交换机;5-Behavioral Model v2',
  `request_path` varchar(500) NOT NULL DEFAULT '' COMMENT '请求路径',
  `request_parameter` text COMMENT '请求参数',
  `response_result` longtext COMMENT '响应结果',
  `response_code` varchar(20) NOT NULL DEFAULT '' COMMENT '响应状态码',
  `delete_flag` tinyint(4) NOT NULL DEFAULT '0' COMMENT '删除标记,0-正常,1-删除',
  `create_by` int(11) NOT NULL DEFAULT '1' COMMENT '创建人id',
  `update_by` int(11) NOT NULL DEFAULT '1' COMMENT '修改人id',
  `create_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后一次更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='编译部署记录表';


CREATE TABLE `compile_logs` (
  `id` bigint(20) NOT NULL COMMENT '记录ID, 通过雪花算法生成',
  `project_id` bigint(20) NOT NULL COMMENT '项目ID',
  `operation_ip` varchar(100) DEFAULT '' COMMENT '设备ip',
  `operation_type` tinyint(4) NOT NULL COMMENT '操作类型，1-前端编译;3-后端编译',
  `network_element_type` tinyint(4) DEFAULT NULL COMMENT '网元类型:1-接入级多模态网元-7132;2-核心级多模态网元-8180;3-虚拟网元;4-Tofino芯片P4交换机;5-Behavioral Model v2',
  `response_result` longtext COMMENT '响应结果',
  `response_code` varchar(20) NOT NULL DEFAULT '' COMMENT '响应状态码',
  `compile_out` longtext COMMENT '编译日志',
  `delete_flag` tinyint(4) NOT NULL DEFAULT '0' COMMENT '删除标记,0-正常,1-删除',
  `create_by` int(11) NOT NULL DEFAULT '1' COMMENT '创建人id',
  `update_by` int(11) NOT NULL DEFAULT '1' COMMENT '修改人id',
  `create_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后一次更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='编译日志表';

CREATE TABLE `element_info` (
  `id` bigint(20) NOT NULL COMMENT '记录ID, 通过雪花算法生成',
  `device_type` varchar(500) NOT NULL DEFAULT '' COMMENT '设备类型',
  `device_model` varchar(500) NOT NULL DEFAULT '' COMMENT '设备型号',
  `picture_name` varchar(500) NOT NULL DEFAULT '' COMMENT '图元图片',
  `picture_path` varchar(500) NOT NULL DEFAULT '' COMMENT '图片路径',
  `delete_flag` tinyint(4) NOT NULL DEFAULT '0' COMMENT '删除标记,0-正常,1-删除',
  `create_by` int(11) NOT NULL DEFAULT '1' COMMENT '创建人id',
  `update_by` int(11) NOT NULL DEFAULT '1' COMMENT '修改人id',
  `create_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后一次更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='图元信息表';

-- 内置八种图元
INSERT INTO element_info (id,device_type,device_model) VALUES
(1,'接入级多模态网元-7132','PINE-A1000-T32X8A1'),
(2,'核心级多模态网元-8180','PINE-B1000-P48C8A'),
(3,'Tofino芯片P4交换机','X-T-Programmeable-Bare-Metal'),
(4,'Behavioral Model v2','Software-Switch-v2'),
(5,'虚拟网元','VPNE-S1000'),
(6,'服务器','服务器'),
(7,'控制器','控制器'),
(8,'客户端','客户端');

ALTER TABLE editor.element_info ADD device_form varchar(500) DEFAULT '' NULL COMMENT '设备形态';
ALTER TABLE editor.element_info ADD pord_form varchar(500) DEFAULT '' NULL COMMENT '端口形态';
ALTER TABLE editor.element_info ADD exchange_capacity varchar(500) DEFAULT '' NULL COMMENT '交换容量';
ALTER TABLE editor.element_info ADD packet_forwarding_rate varchar(500) DEFAULT '' NULL COMMENT '包转发率';
ALTER TABLE editor.element_info ADD cpu_system varchar(500) DEFAULT '' NULL COMMENT 'CPU系统';
ALTER TABLE editor.element_info ADD ssd varchar(500) DEFAULT '' NULL COMMENT 'SSD';
ALTER TABLE editor.element_info ADD fpga_chip varchar(500) DEFAULT '' NULL COMMENT 'FPGA芯片';
ALTER TABLE editor.element_info ADD storage_configuration varchar(500) DEFAULT '' NULL COMMENT '存储配置';
ALTER TABLE editor.element_info ADD management_interface varchar(500) DEFAULT '' NULL COMMENT '管理接口';
ALTER TABLE editor.element_info ADD power_supply varchar(500) DEFAULT '' NULL COMMENT '电源供应';
