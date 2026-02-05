"""
Telemetry Module

Network telemetry collection and analysis:
- Traffic statistics
- Latency measurement
- Cache hit rates
- Performance metrics
"""

from paranet.controller.telemetry.collector import TelemetryCollector
from paranet.controller.telemetry.metrics import Metrics, MetricType

__all__ = [
    "TelemetryCollector",
    "Metrics",
    "MetricType",
]
