"""
Intent IR Module

Protocol-agnostic intermediate representation for network intents.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class IRType(Enum):
    """Types of IR nodes."""
    # Topology nodes
    NETWORK = "network"
    NODE = "node"
    LINK = "link"
    
    # Intent nodes
    ROUTE = "route"
    FORWARD = "forward"
    POLICY = "policy"
    QOS = "qos"
    
    # Protocol-specific hints
    IP_CONFIG = "ip_config"
    NDN_CONFIG = "ndn_config"
    GEO_CONFIG = "geo_config"
    P4_CONFIG = "p4_config"


@dataclass
class IRNode:
    """A node in the Intent IR graph."""
    ir_type: IRType
    name: str
    attributes: dict[str, Any] = field(default_factory=dict)
    children: list["IRNode"] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)
    
    def add_child(self, child: "IRNode") -> None:
        """Add a child node."""
        self.children.append(child)
    
    def get_attr(self, key: str, default: Any = None) -> Any:
        """Get an attribute value."""
        return self.attributes.get(key, default)
    
    def set_attr(self, key: str, value: Any) -> None:
        """Set an attribute value."""
        self.attributes[key] = value


@dataclass 
class IntentIR:
    """
    Intent Intermediate Representation.
    
    A protocol-agnostic representation of network configuration intent
    that can be compiled to multiple target platforms.
    """
    root: IRNode | None = None
    version: str = "1.0"
    metadata: dict[str, Any] = field(default_factory=dict)
    
    @classmethod
    def from_ast(cls, ast: Any) -> "IntentIR":
        """
        Create IntentIR from parsed AST.
        
        Args:
            ast: Abstract Syntax Tree from DSL parser.
            
        Returns:
            IntentIR instance.
        """
        # TODO: Implement AST transformation
        ir = cls()
        ir.root = IRNode(
            ir_type=IRType.NETWORK,
            name="root",
            metadata={"source": "ast"}
        )
        return ir
    
    def validate(self) -> list[str]:
        """
        Validate the IR for semantic correctness.
        
        Returns:
            List of validation error messages (empty if valid).
        """
        errors = []
        
        if self.root is None:
            errors.append("IR has no root node")
            return errors
        
        # TODO: Implement comprehensive validation
        # - Check for undefined references
        # - Validate constraints
        # - Check protocol compatibility
        
        return errors
    
    def optimize(self) -> "IntentIR":
        """
        Apply optimization passes to the IR.
        
        Returns:
            Optimized IntentIR (may be self or new instance).
        """
        # TODO: Implement optimization passes
        # - Merge redundant nodes
        # - Simplify constraints
        # - Reorder for efficiency
        return self
    
    def to_dict(self) -> dict[str, Any]:
        """Serialize IR to dictionary."""
        def node_to_dict(node: IRNode) -> dict[str, Any]:
            return {
                "type": node.ir_type.value,
                "name": node.name,
                "attributes": node.attributes,
                "children": [node_to_dict(c) for c in node.children],
                "metadata": node.metadata,
            }
        
        return {
            "version": self.version,
            "metadata": self.metadata,
            "root": node_to_dict(self.root) if self.root else None,
        }
