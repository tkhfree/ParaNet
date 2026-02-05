"""
DSL Parser Module

Parses ParaNet DSL into Abstract Syntax Tree.
Uses Lark parser generator.
"""

from pathlib import Path
from typing import Any

try:
    from lark import Lark, Transformer, v_args
    LARK_AVAILABLE = True
except ImportError:
    LARK_AVAILABLE = False

from paranet.compiler.ir.intent_ir import IntentIR


# Default grammar path
GRAMMAR_PATH = Path(__file__).parent.parent.parent.parent / "dsl" / "grammar" / "paranet.lark"


class DSLParser:
    """
    Parser for ParaNet DSL.
    
    Converts DSL text into Abstract Syntax Tree and then to Intent IR.
    """
    
    def __init__(self, grammar_path: Path | str | None = None):
        """
        Initialize the DSL parser.
        
        Args:
            grammar_path: Path to Lark grammar file. Uses default if None.
        """
        if not LARK_AVAILABLE:
            raise ImportError(
                "Lark parser not installed. Install with: pip install lark"
            )
        
        self._grammar_path = Path(grammar_path) if grammar_path else GRAMMAR_PATH
        self._parser: Lark | None = None
        self._transformer: Any = None
    
    def _load_grammar(self) -> None:
        """Load and compile the grammar."""
        if not self._grammar_path.exists():
            raise FileNotFoundError(
                f"Grammar file not found: {self._grammar_path}"
            )
        
        grammar_text = self._grammar_path.read_text(encoding="utf-8")
        self._parser = Lark(
            grammar_text,
            start="program",
            parser="lalr",
            transformer=self._transformer,
        )
    
    @property
    def parser(self) -> "Lark":
        """Get the Lark parser instance, loading if necessary."""
        if self._parser is None:
            self._load_grammar()
        return self._parser  # type: ignore
    
    def parse(self, source: str) -> Any:
        """
        Parse DSL source code into AST.
        
        Args:
            source: DSL source code string.
            
        Returns:
            Parsed AST.
        """
        return self.parser.parse(source)
    
    def parse_file(self, filepath: Path | str) -> Any:
        """
        Parse a DSL source file.
        
        Args:
            filepath: Path to DSL source file.
            
        Returns:
            Parsed AST.
        """
        source = Path(filepath).read_text(encoding="utf-8")
        return self.parse(source)
    
    def compile_to_ir(self, source: str) -> IntentIR:
        """
        Parse and compile DSL source to Intent IR.
        
        Args:
            source: DSL source code string.
            
        Returns:
            IntentIR representation.
        """
        ast = self.parse(source)
        # TODO: Implement AST to IR transformation
        return IntentIR.from_ast(ast)
