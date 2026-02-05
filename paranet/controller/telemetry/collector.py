"""
Telemetry Collector Module

Collects telemetry data from network devices.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Callable


@dataclass
class TelemetryData:
    """A telemetry data point."""
    device_id: str
    metric_name: str
    value: float
    timestamp: datetime = field(default_factory=datetime.now)
    labels: dict[str, str] = field(default_factory=dict)


class TelemetryCollector:
    """
    Collects and aggregates telemetry data from network devices.
    
    Features:
    - Periodic polling
    - Push-based collection
    - Data aggregation
    - Alerting hooks
    """
    
    def __init__(self):
        """Initialize the telemetry collector."""
        self._data: list[TelemetryData] = []
        self._callbacks: list[Callable[[TelemetryData], None]] = []
        self._polling_interval: float = 10.0  # seconds
    
    def collect(self, data: TelemetryData) -> None:
        """
        Collect a telemetry data point.
        
        Args:
            data: Telemetry data to collect.
        """
        self._data.append(data)
        
        # Notify callbacks
        for callback in self._callbacks:
            callback(data)
    
    def query(
        self,
        device_id: str | None = None,
        metric_name: str | None = None,
        start_time: datetime | None = None,
        end_time: datetime | None = None,
    ) -> list[TelemetryData]:
        """
        Query collected telemetry data.
        
        Args:
            device_id: Filter by device ID.
            metric_name: Filter by metric name.
            start_time: Filter by start time.
            end_time: Filter by end time.
            
        Returns:
            Matching telemetry data points.
        """
        results = self._data
        
        if device_id:
            results = [d for d in results if d.device_id == device_id]
        
        if metric_name:
            results = [d for d in results if d.metric_name == metric_name]
        
        if start_time:
            results = [d for d in results if d.timestamp >= start_time]
        
        if end_time:
            results = [d for d in results if d.timestamp <= end_time]
        
        return results
    
    def register_callback(
        self,
        callback: Callable[[TelemetryData], None],
    ) -> None:
        """
        Register a callback for new telemetry data.
        
        Args:
            callback: Function to call with new data.
        """
        self._callbacks.append(callback)
    
    def aggregate(
        self,
        device_id: str,
        metric_name: str,
        aggregation: str = "avg",
    ) -> float | None:
        """
        Aggregate telemetry data.
        
        Args:
            device_id: Device to aggregate.
            metric_name: Metric to aggregate.
            aggregation: Aggregation function (avg, sum, min, max, count).
            
        Returns:
            Aggregated value or None if no data.
        """
        data = self.query(device_id=device_id, metric_name=metric_name)
        
        if not data:
            return None
        
        values = [d.value for d in data]
        
        if aggregation == "avg":
            return sum(values) / len(values)
        elif aggregation == "sum":
            return sum(values)
        elif aggregation == "min":
            return min(values)
        elif aggregation == "max":
            return max(values)
        elif aggregation == "count":
            return float(len(values))
        else:
            raise ValueError(f"Unknown aggregation: {aggregation}")
    
    def clear(self) -> None:
        """Clear all collected data."""
        self._data.clear()
