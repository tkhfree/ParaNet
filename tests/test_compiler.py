"""
Tests for ParaNet compiler.
"""

import pytest
from pathlib import Path

from paranet.compiler.ir.intent_ir import IntentIR, IRNode, IRType


class TestIntentIR:
    """Tests for Intent IR."""
    
    def test_create_ir(self):
        """Test creating Intent IR."""
        ir = IntentIR()
        assert ir.root is None
        assert ir.version == "1.0"
    
    def test_ir_node_creation(self):
        """Test IRNode creation."""
        node = IRNode(
            ir_type=IRType.NETWORK,
            name="test-network",
            attributes={"description": "Test"},
        )
        assert node.ir_type == IRType.NETWORK
        assert node.name == "test-network"
    
    def test_ir_node_add_child(self):
        """Test adding child nodes."""
        parent = IRNode(ir_type=IRType.NETWORK, name="net")
        child = IRNode(ir_type=IRType.NODE, name="node1")
        
        parent.add_child(child)
        
        assert len(parent.children) == 1
        assert parent.children[0] == child
    
    def test_ir_validation_empty(self):
        """Test IR validation with no root."""
        ir = IntentIR()
        errors = ir.validate()
        assert len(errors) > 0
        assert "no root" in errors[0].lower()
    
    def test_ir_validation_with_root(self):
        """Test IR validation with root."""
        ir = IntentIR()
        ir.root = IRNode(ir_type=IRType.NETWORK, name="test")
        errors = ir.validate()
        assert len(errors) == 0
    
    def test_ir_to_dict(self):
        """Test IR serialization to dict."""
        ir = IntentIR()
        ir.root = IRNode(
            ir_type=IRType.NETWORK,
            name="test",
            attributes={"key": "value"},
        )
        
        data = ir.to_dict()
        
        assert data["version"] == "1.0"
        assert data["root"]["type"] == "network"
        assert data["root"]["name"] == "test"


class TestDSLParser:
    """Tests for DSL parser (requires lark)."""
    
    @pytest.fixture
    def parser(self):
        """Create a parser instance."""
        try:
            from paranet.compiler.frontend.parser import DSLParser
            return DSLParser()
        except ImportError:
            pytest.skip("Lark not installed")
        except FileNotFoundError:
            pytest.skip("Grammar file not found")
    
    def test_parser_initialization(self, parser):
        """Test parser can be initialized."""
        assert parser is not None
