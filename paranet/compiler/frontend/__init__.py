"""
Compiler Frontend Module

DSL parsing and syntax analysis:
- Lexical analysis
- Syntax parsing  
- AST generation
"""

from paranet.compiler.frontend.parser import DSLParser

__all__ = [
    "DSLParser",
]
