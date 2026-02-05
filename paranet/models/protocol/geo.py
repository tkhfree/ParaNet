"""
GEO Protocol Models

Data models for geographic routing.
"""

from dataclasses import dataclass, field
from enum import Enum
from math import radians, cos, sin, sqrt, atan2
from typing import Any

from pydantic import BaseModel, Field


class GeoCoordinate(BaseModel):
    """Geographic coordinate (WGS84)."""
    latitude: float = Field(..., ge=-90, le=90, description="Latitude in degrees")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude in degrees")
    altitude: float | None = Field(default=None, description="Altitude in meters")
    
    def distance_to(self, other: "GeoCoordinate") -> float:
        """
        Calculate great-circle distance to another coordinate.
        
        Uses the Haversine formula.
        
        Args:
            other: Target coordinate.
            
        Returns:
            Distance in kilometers.
        """
        R = 6371  # Earth's radius in km
        
        lat1 = radians(self.latitude)
        lat2 = radians(other.latitude)
        dlat = radians(other.latitude - self.latitude)
        dlon = radians(other.longitude - self.longitude)
        
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        
        return R * c
    
    def bearing_to(self, other: "GeoCoordinate") -> float:
        """
        Calculate initial bearing to another coordinate.
        
        Args:
            other: Target coordinate.
            
        Returns:
            Bearing in degrees (0-360, clockwise from north).
        """
        from math import degrees, atan2, cos, sin, radians
        
        lat1 = radians(self.latitude)
        lat2 = radians(other.latitude)
        dlon = radians(other.longitude - self.longitude)
        
        x = sin(dlon) * cos(lat2)
        y = cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(dlon)
        
        bearing = degrees(atan2(x, y))
        return (bearing + 360) % 360


class GeoRegion(BaseModel):
    """A geographic region defined by a polygon."""
    name: str = Field(..., description="Region name/identifier")
    vertices: list[GeoCoordinate] = Field(
        default_factory=list,
        description="Polygon vertices (must have at least 3)",
    )
    metadata: dict[str, Any] = Field(default_factory=dict)
    
    def contains(self, point: GeoCoordinate) -> bool:
        """
        Check if a point is inside this region.
        
        Uses ray casting algorithm.
        
        Args:
            point: Point to check.
            
        Returns:
            True if point is inside the region.
        """
        if len(self.vertices) < 3:
            return False
        
        n = len(self.vertices)
        inside = False
        
        j = n - 1
        for i in range(n):
            vi = self.vertices[i]
            vj = self.vertices[j]
            
            if ((vi.latitude > point.latitude) != (vj.latitude > point.latitude) and
                point.longitude < (vj.longitude - vi.longitude) * 
                (point.latitude - vi.latitude) / (vj.latitude - vi.latitude) + vi.longitude):
                inside = not inside
            
            j = i
        
        return inside
    
    def centroid(self) -> GeoCoordinate:
        """Calculate the centroid of this region."""
        if not self.vertices:
            raise ValueError("Cannot calculate centroid of empty region")
        
        lat_sum = sum(v.latitude for v in self.vertices)
        lon_sum = sum(v.longitude for v in self.vertices)
        n = len(self.vertices)
        
        return GeoCoordinate(
            latitude=lat_sum / n,
            longitude=lon_sum / n,
        )


class GeoRoutingMode(Enum):
    """Geographic routing modes."""
    GREEDY = "greedy"  # Forward to neighbor closest to destination
    PERIMETER = "perimeter"  # Follow face routing when greedy fails
    GPSR = "gpsr"  # Greedy Perimeter Stateless Routing
    GOAFR = "goafr"  # Greedy Other Adaptive Face Routing


@dataclass
class GeoRoute:
    """Geographic routing rule."""
    name: str
    source_region: str | None = None  # Region name or None for any
    destination_region: str
    mode: GeoRoutingMode = GeoRoutingMode.GREEDY
    priority: int = 0
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class NodeLocation:
    """Location assignment for a network node."""
    node_id: str
    location: GeoCoordinate
    region: str | None = None
    velocity: tuple[float, float, float] | None = None  # m/s (x, y, z)
    last_update: float | None = None  # timestamp
