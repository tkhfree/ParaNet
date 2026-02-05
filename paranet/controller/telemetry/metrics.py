"""
Metrics Module

Defines standard network metrics and their types.
"""

from dataclasses import dataclass
from enum import Enum


class MetricType(Enum):
    """Types of metrics."""
    COUNTER = "counter"      # Monotonically increasing value
    GAUGE = "gauge"          # Value that can go up or down
    HISTOGRAM = "histogram"  # Distribution of values
    SUMMARY = "summary"      # Similar to histogram with quantiles


@dataclass
class MetricDefinition:
    """Definition of a metric."""
    name: str
    description: str
    metric_type: MetricType
    unit: str = ""
    labels: list[str] | None = None


class Metrics:
    """
    Standard network metric definitions.
    
    Provides constants for common network telemetry metrics.
    """
    
    # Traffic metrics
    BYTES_IN = MetricDefinition(
        name="bytes_in",
        description="Total bytes received",
        metric_type=MetricType.COUNTER,
        unit="bytes",
        labels=["device", "interface"],
    )
    
    BYTES_OUT = MetricDefinition(
        name="bytes_out",
        description="Total bytes sent",
        metric_type=MetricType.COUNTER,
        unit="bytes",
        labels=["device", "interface"],
    )
    
    PACKETS_IN = MetricDefinition(
        name="packets_in",
        description="Total packets received",
        metric_type=MetricType.COUNTER,
        unit="packets",
        labels=["device", "interface"],
    )
    
    PACKETS_OUT = MetricDefinition(
        name="packets_out",
        description="Total packets sent",
        metric_type=MetricType.COUNTER,
        unit="packets",
        labels=["device", "interface"],
    )
    
    # Latency metrics
    RTT = MetricDefinition(
        name="rtt",
        description="Round-trip time",
        metric_type=MetricType.GAUGE,
        unit="milliseconds",
        labels=["device", "destination"],
    )
    
    LATENCY = MetricDefinition(
        name="latency",
        description="One-way latency",
        metric_type=MetricType.HISTOGRAM,
        unit="milliseconds",
        labels=["device", "path"],
    )
    
    # NDN-specific metrics
    NDN_CACHE_HITS = MetricDefinition(
        name="ndn_cache_hits",
        description="NDN content store cache hits",
        metric_type=MetricType.COUNTER,
        labels=["device"],
    )
    
    NDN_CACHE_MISSES = MetricDefinition(
        name="ndn_cache_misses",
        description="NDN content store cache misses",
        metric_type=MetricType.COUNTER,
        labels=["device"],
    )
    
    NDN_INTERESTS = MetricDefinition(
        name="ndn_interests",
        description="NDN interests processed",
        metric_type=MetricType.COUNTER,
        labels=["device", "prefix"],
    )
    
    NDN_DATA = MetricDefinition(
        name="ndn_data",
        description="NDN data packets forwarded",
        metric_type=MetricType.COUNTER,
        labels=["device", "prefix"],
    )
    
    # P4-specific metrics
    P4_TABLE_ENTRIES = MetricDefinition(
        name="p4_table_entries",
        description="P4 table entry count",
        metric_type=MetricType.GAUGE,
        labels=["device", "table"],
    )
    
    P4_TABLE_HITS = MetricDefinition(
        name="p4_table_hits",
        description="P4 table lookup hits",
        metric_type=MetricType.COUNTER,
        labels=["device", "table"],
    )
    
    @classmethod
    def all_metrics(cls) -> list[MetricDefinition]:
        """Get all defined metrics."""
        return [
            v for v in vars(cls).values()
            if isinstance(v, MetricDefinition)
        ]
