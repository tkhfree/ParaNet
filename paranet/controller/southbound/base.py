"""
Southbound Driver Base Module

Abstract base class for southbound interface drivers.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Any


class ConnectionStatus(Enum):
    """Device connection status."""
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    ERROR = "error"


@dataclass
class DeviceInfo:
    """Information about a network device."""
    device_id: str
    device_type: str
    address: str
    port: int
    status: ConnectionStatus = ConnectionStatus.DISCONNECTED
    metadata: dict[str, Any] | None = None


class SouthboundDriver(ABC):
    """
    Abstract base class for southbound interface drivers.
    
    Each driver implements communication with a specific type of network device.
    """
    
    @property
    @abstractmethod
    def driver_type(self) -> str:
        """Driver type identifier (p4runtime, nfd, netconf, rest)."""
        pass
    
    @abstractmethod
    def connect(self, device: DeviceInfo) -> bool:
        """
        Establish connection to a device.
        
        Args:
            device: Device to connect to.
            
        Returns:
            True if connection successful, False otherwise.
        """
        pass
    
    @abstractmethod
    def disconnect(self, device_id: str) -> bool:
        """
        Disconnect from a device.
        
        Args:
            device_id: ID of device to disconnect.
            
        Returns:
            True if disconnection successful, False otherwise.
        """
        pass
    
    @abstractmethod
    def push_config(self, device_id: str, config: Any) -> bool:
        """
        Push configuration to a device.
        
        Args:
            device_id: Target device ID.
            config: Configuration to push.
            
        Returns:
            True if push successful, False otherwise.
        """
        pass
    
    @abstractmethod
    def get_state(self, device_id: str) -> dict[str, Any]:
        """
        Get current state from a device.
        
        Args:
            device_id: Target device ID.
            
        Returns:
            Dict containing device state.
        """
        pass
    
    def is_connected(self, device_id: str) -> bool:
        """Check if connected to a device."""
        return False  # Override in subclasses
