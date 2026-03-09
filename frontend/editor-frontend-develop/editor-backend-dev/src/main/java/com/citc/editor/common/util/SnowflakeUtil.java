package com.citc.editor.common.util;

public class SnowflakeUtil {
        // 初始时间戳，作为基准时间
        private static final long twepoch = 1288834974657L;
        // 机器ID所占的位数
        private static final long workerIdBits = 5L;
        // 数据中心ID所占的位数
        private static final long datacenterIdBits = 5L;
        // 序列号所占的位数
        private static final long sequenceBits = 12L;
        // 机器ID向左移的位数
        private static final long workerIdShift = sequenceBits;
        // 数据中心ID向左移的位数
        private static final long datacenterIdShift = sequenceBits + workerIdBits;
        // 时间戳向左移的位数
        private static final long timestampLeftShift = sequenceBits + workerIdBits + datacenterIdBits;
        // 生成序列的掩码
        private static final long sequenceMask = ~(-1L << sequenceBits);
        // 工作机器ID
        private static final long workerId = 1;
        // 数据中心ID
        private static final long datacenterId = 1;
        // 毫秒内序列
        private static long sequence = 0L;
        // 上次生成ID的时间戳
        private static long lastTimestamp = -1L;

        public static synchronized long nextId() {
            long timestamp = timeGen();
            if (timestamp < lastTimestamp) {
                throw new RuntimeException("Clock moved backwards. Refusing to generate id for " + (lastTimestamp - timestamp) + " milliseconds");
            }
            if (lastTimestamp == timestamp) {
                sequence = (sequence + 1) & sequenceMask;
                if (sequence == 0) {
                    timestamp = tilNextMillis(lastTimestamp);
                }
            } else {
                sequence = 0L;
            }
            lastTimestamp = timestamp;
            return ((timestamp - twepoch) << timestampLeftShift) //
                    | (datacenterId << datacenterIdShift) //
                    | (workerId << workerIdShift) //
                    | sequence;
        }

        private static long tilNextMillis(long lastTimestamp) {
            long timestamp = timeGen();
            while (timestamp <= lastTimestamp) {
                timestamp = timeGen();
            }
            return timestamp;
        }

        private static long timeGen() {
            return System.currentTimeMillis();
        }
}
