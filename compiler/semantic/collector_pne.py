"""Collect typed program IR from the explicit PNE AST."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from compiler.ir.common import Diagnostic, DiagnosticSeverity, SourceSpan
from compiler.ir import (
    ApplicationIR,
    ConditionIR,
    FunctionIR,
    InstructionIR,
    MapDeclIR,
    ModuleIR,
    ParamIR,
    ProgramIR,
    RegisterDeclIR,
    ServiceIR,
    SetDeclIR,
    TypeRef,
)
from compiler.frontend.pne_ast import (
    ApplicationNode,
    ApplyCallNode,
    AssertNode,
    AssignNode,
    CallExpressionNode,
    CallStatementNode,
    ExpressionNode,
    ExpressionStatementNode,
    FieldAccessNode,
    BinaryExpressionNode,
    FunctionDeclNode,
    HexLiteralNode,
    IdentifierNode,
    IfNode,
    IndexExpressionNode,
    IntegerLiteralNode,
    IpLiteralNode,
    MapDeclNode,
    MapEntryNode,
    ModuleNode,
    NullStatementNode,
    ParamNode,
    PrimitiveCallNode,
    ProgramNode,
    RegisterDeclNode,
    ServiceNode,
    SetDeclNode,
    SliceExpressionNode,
    StatementNode,
    SwitchCaseNode,
    SwitchNode,
    TupleExpressionNode,
    TypeNode,
    UnaryExpressionNode,
    VarDeclNode,
)


@dataclass(slots=True)
class SemanticResult:
    program: ProgramIR
    diagnostics: list[Diagnostic] = field(default_factory=list)


class ProgramCollector:
    """Collect top-level declarations and bodies into ProgramIR."""

    def collect(self, program_node: ProgramNode) -> SemanticResult:
        diagnostics: list[Diagnostic] = []
        program = ProgramIR()

        for decl in program_node.declarations:
            if isinstance(decl, ServiceNode):
                self._register_service(program, decl, diagnostics)
            elif isinstance(decl, ApplicationNode):
                self._register_application(program, decl, diagnostics)
            elif isinstance(decl, ModuleNode):
                self._register_module(program, decl, diagnostics)

        for decl in program_node.declarations:
            if isinstance(decl, ServiceNode):
                continue
            if isinstance(decl, ApplicationNode):
                self._populate_application(program, decl, diagnostics)
            elif isinstance(decl, ModuleNode):
                self._populate_module(program, decl, diagnostics)

        for service in program.services.values():
            for app_name in service.application_chain:
                if app_name not in program.applications:
                    diagnostics.append(
                        Diagnostic(
                            code="SEM004",
                            message=f"Undefined application '{app_name}' in service '{service.name}'",
                            severity=DiagnosticSeverity.ERROR,
                            span=service.span,
                        )
                    )

        return SemanticResult(program=program, diagnostics=diagnostics)

    def _register_service(
        self, program: ProgramIR, service: ServiceNode, diagnostics: list[Diagnostic]
    ) -> None:
        if service.name in program.services:
            diagnostics.append(self._duplicate("SEM001", "service", service.name, service.span))
            return
        program.services[service.name] = ServiceIR(
            name=service.name,
            application_chain=list(service.applications),
            span=service.span,
        )

    def _register_application(
        self, program: ProgramIR, app: ApplicationNode, diagnostics: list[Diagnostic]
    ) -> None:
        if app.name in program.applications:
            diagnostics.append(self._duplicate("SEM002", "application", app.name, app.span))
            return
        program.applications[app.name] = ApplicationIR(
            name=app.name,
            parser_name=app.parser_name,
            span=app.span,
        )

    def _register_module(
        self, program: ProgramIR, module: ModuleNode, diagnostics: list[Diagnostic]
    ) -> None:
        if module.name in program.modules:
            diagnostics.append(self._duplicate("SEM003", "module", module.name, module.span))
            return
        program.modules[module.name] = ModuleIR(
            name=module.name,
            params=[self._convert_param(param) for param in module.params],
            parser_name=module.parser_name,
            parser_headers=[
                self._expr_to_value(header)
                for header in (module.parser_block.headers if module.parser_block else [])
            ],
            span=module.span,
        )

    def _populate_application(
        self, program: ProgramIR, app: ApplicationNode, diagnostics: list[Diagnostic]
    ) -> None:
        target = program.applications[app.name]
        local_vars: dict[str, TypeRef] = {}
        instructions: list[InstructionIR] = []
        for statement in app.body:
            result = self._consume_statement(
                program=program,
                statement=statement,
                diagnostics=diagnostics,
                local_vars=local_vars,
                maps=None,
                sets=None,
                registers=None,
                functions=None,
            )
            if result is not None:
                instructions.append(result)
        target.local_vars = local_vars
        target.body = instructions

    def _populate_module(
        self, program: ProgramIR, module: ModuleNode, diagnostics: list[Diagnostic]
    ) -> None:
        target = program.modules[module.name]
        local_vars: dict[str, TypeRef] = {}
        maps: dict[str, MapDeclIR] = {}
        sets: dict[str, SetDeclIR] = {}
        registers: dict[str, RegisterDeclIR] = {}
        functions: dict[str, FunctionIR] = {}
        instructions: list[InstructionIR] = []

        control_statements = module.control_block.statements if module.control_block else []
        for statement in control_statements:
            result = self._consume_statement(
                program=program,
                statement=statement,
                diagnostics=diagnostics,
                local_vars=local_vars,
                maps=maps,
                sets=sets,
                registers=registers,
                functions=functions,
            )
            if result is not None:
                instructions.append(result)

        target.local_vars = local_vars
        target.maps = maps
        target.sets = sets
        target.registers = registers
        target.functions = functions
        target.body = instructions

    def _consume_statement(
        self,
        program: ProgramIR,
        statement: StatementNode,
        diagnostics: list[Diagnostic],
        local_vars: dict[str, TypeRef],
        maps: dict[str, MapDeclIR] | None,
        sets: dict[str, SetDeclIR] | None,
        registers: dict[str, RegisterDeclIR] | None,
        functions: dict[str, FunctionIR] | None,
    ) -> InstructionIR | None:
        if isinstance(statement, VarDeclNode):
            if statement.name in local_vars:
                diagnostics.append(self._duplicate("SEM010", "variable", statement.name, statement.span))
            else:
                local_vars[statement.name] = self._convert_type(statement.type_ref)
            return None

        if isinstance(statement, MapDeclNode):
            if maps is None:
                diagnostics.append(self._unsupported_scope("map", statement.span))
                return None
            if statement.name in maps:
                diagnostics.append(self._duplicate("SEM011", "map", statement.name, statement.span))
            else:
                maps[statement.name] = MapDeclIR(
                    name=statement.name,
                    key_types=[self._convert_type(item) for item in statement.key_types],
                    value_types=[self._convert_type(item) for item in statement.value_types],
                    size=statement.size,
                    entries=[self._entry_to_values(entry) for entry in statement.entries],
                    is_static=statement.is_static,
                    span=statement.span,
                )
            return None

        if isinstance(statement, SetDeclNode):
            if sets is None:
                diagnostics.append(self._unsupported_scope("set", statement.span))
                return None
            for name in statement.names:
                if name in sets:
                    diagnostics.append(self._duplicate("SEM012", "set", name, statement.span))
                else:
                    sets[name] = SetDeclIR(
                        names=[name],
                        key_types=[self._convert_type(item) for item in statement.key_types],
                        entries=[self._entry_to_values(entry) for entry in statement.entries],
                        is_static=statement.is_static,
                        span=statement.span,
                    )
            return None

        if isinstance(statement, RegisterDeclNode):
            if registers is None:
                diagnostics.append(self._unsupported_scope("register", statement.span))
                return None
            if statement.name in registers:
                diagnostics.append(self._duplicate("SEM013", "register", statement.name, statement.span))
            else:
                registers[statement.name] = RegisterDeclIR(
                    name=statement.name,
                    value_type=self._convert_type(statement.type_ref),
                    size=statement.size,
                    is_static=statement.is_static,
                    span=statement.span,
                )
            return None

        if isinstance(statement, FunctionDeclNode):
            if functions is None:
                diagnostics.append(self._unsupported_scope("function", statement.span))
                return None
            if statement.name in functions:
                diagnostics.append(self._duplicate("SEM014", "function", statement.name, statement.span))
                return None
            functions[statement.name] = FunctionIR(
                name=statement.name,
                params=[self._convert_param(param) for param in statement.params],
                body=self._collect_function_body(program, statement, diagnostics),
                span=statement.span,
            )
            return None

        if isinstance(statement, AssignNode):
            return InstructionIR(
                kind="assign",
                data={
                    "targets": [self._expr_to_value(target) for target in statement.targets],
                    "value": self._expr_to_value(statement.value),
                },
                span=statement.span,
            )

        if isinstance(statement, ApplyCallNode):
            if statement.target not in program.modules:
                diagnostics.append(
                    Diagnostic(
                        code="SEM020",
                        message=f"Undefined module '{statement.target}' in apply()",
                        severity=DiagnosticSeverity.ERROR,
                        span=statement.span,
                    )
                )
            return InstructionIR(
                kind="apply",
                data={
                    "target": statement.target,
                    "args": [self._expr_to_value(arg) for arg in statement.args],
                },
                span=statement.span,
            )

        if isinstance(statement, CallStatementNode):
            return InstructionIR(
                kind="call",
                data={
                    "callee": self._expr_to_value(statement.callee),
                    "args": [self._expr_to_value(arg) for arg in statement.args],
                },
                span=statement.span,
            )

        if isinstance(statement, PrimitiveCallNode):
            return InstructionIR(
                kind="primitive",
                data={
                    "name": statement.name,
                    "args": [self._expr_to_value(arg) for arg in statement.args],
                },
                span=statement.span,
            )

        if isinstance(statement, AssertNode):
            return InstructionIR(
                kind="assert",
                data={"condition": self._condition_to_ir(statement.condition).to_dict()},
                span=statement.span,
            )

        if isinstance(statement, IfNode):
            return InstructionIR(
                kind="if",
                data={
                    "condition": self._condition_to_ir(statement.condition).to_dict(),
                    "then_body": self._collect_nested_instructions(
                        program, statement.then_body, diagnostics, local_vars
                    ),
                    "else_body": self._collect_nested_instructions(
                        program, statement.else_body, diagnostics, local_vars
                    ),
                },
                span=statement.span,
            )

        if isinstance(statement, SwitchNode):
            return InstructionIR(
                kind="switch",
                data={
                    "keys": [self._expr_to_value(key) for key in statement.keys],
                    "cases": [self._switch_case_to_dict(program, item, diagnostics, local_vars) for item in statement.cases],
                },
                span=statement.span,
            )

        if isinstance(statement, ExpressionStatementNode):
            diagnostics.append(
                Diagnostic(
                    code="SEM021",
                    message="Bare expression statements are not supported",
                    severity=DiagnosticSeverity.ERROR,
                    span=statement.span,
                )
            )
            return InstructionIR(
                kind="expression",
                data={"expression": self._expr_to_value(statement.expression)},
                span=statement.span,
            )

        if isinstance(statement, NullStatementNode):
            return InstructionIR(kind="noop", data={}, span=statement.span)

        diagnostics.append(
            Diagnostic(
                code="SEM099",
                message=f"Unhandled statement type: {statement.__class__.__name__}",
                severity=DiagnosticSeverity.ERROR,
                span=statement.span,
            )
        )
        return None

    def _collect_function_body(
        self,
        program: ProgramIR,
        function: FunctionDeclNode,
        diagnostics: list[Diagnostic],
    ) -> list[InstructionIR]:
        local_vars = {param.name: self._convert_type(param.type_ref) for param in function.params}
        instructions: list[InstructionIR] = []
        for statement in function.body:
            result = self._consume_statement(
                program=program,
                statement=statement,
                diagnostics=diagnostics,
                local_vars=local_vars,
                maps=None,
                sets=None,
                registers=None,
                functions=None,
            )
            if result is not None:
                instructions.append(result)
        return instructions

    def _collect_nested_instructions(
        self,
        program: ProgramIR,
        statements: list[StatementNode],
        diagnostics: list[Diagnostic],
        parent_scope: dict[str, TypeRef],
    ) -> list[dict[str, Any]]:
        scope = dict(parent_scope)
        instructions: list[dict[str, Any]] = []
        for statement in statements:
            result = self._consume_statement(
                program=program,
                statement=statement,
                diagnostics=diagnostics,
                local_vars=scope,
                maps=None,
                sets=None,
                registers=None,
                functions=None,
            )
            if result is not None:
                instructions.append(result.to_dict())
        return instructions

    def _switch_case_to_dict(
        self,
        program: ProgramIR,
        case: SwitchCaseNode,
        diagnostics: list[Diagnostic],
        local_vars: dict[str, TypeRef],
    ) -> dict[str, Any]:
        body_result = (
            self._consume_statement(
                program=program,
                statement=case.body,
                diagnostics=diagnostics,
                local_vars=dict(local_vars),
                maps=None,
                sets=None,
                registers=None,
                functions=None,
            )
            if case.body is not None
            else None
        )
        return {
            "label": None if case.label is None else self._expr_to_value(case.label),
            "is_default": case.is_default,
            "body": None if body_result is None else body_result.to_dict(),
        }

    def _entry_to_values(self, entry: MapEntryNode) -> list[object]:
        return [self._expr_to_value(value) for value in entry.values]

    def _convert_param(self, param: ParamNode) -> ParamIR:
        return ParamIR(
            name=param.name,
            direction=param.direction,
            type_ref=self._convert_type(param.type_ref),
            span=param.span,
        )

    def _convert_type(self, type_node: TypeNode | None) -> TypeRef:
        if type_node is None:
            return TypeRef(name="unknown")
        return TypeRef(name=type_node.name, width=type_node.width)

    def _condition_to_ir(self, expression: ExpressionNode | None) -> ConditionIR:
        if expression is None:
            return ConditionIR(kind="expression", left=None)
        if isinstance(expression, BinaryExpressionNode):
            kind = "logical" if expression.operator in {"&&", "||"} else "compare"
            if expression.operator == "in":
                kind = "in"
            return ConditionIR(
                kind=kind,
                operator=expression.operator,
                left=self._expr_to_value(expression.left),
                right=self._expr_to_value(expression.right),
            )
        if isinstance(expression, CallExpressionNode):
            callee = expression.callee
            if isinstance(callee, FieldAccessNode) and callee.parts and callee.parts[-1] == "isValid":
                return ConditionIR(
                    kind="isvalid",
                    operator="call",
                    left={"callee": self._expr_to_value(callee)},
                    right=[self._expr_to_value(arg) for arg in expression.args],
                )
        return ConditionIR(kind="expression", left=self._expr_to_value(expression))

    def _expr_to_value(self, expression: ExpressionNode | None) -> Any:
        if expression is None:
            return None
        if isinstance(expression, IdentifierNode):
            return {"kind": "identifier", "name": expression.name}
        if isinstance(expression, IntegerLiteralNode):
            return {"kind": "int", "value": expression.value, "raw": expression.raw}
        if isinstance(expression, HexLiteralNode):
            return {"kind": "hex", "value": expression.value}
        if isinstance(expression, IpLiteralNode):
            return {"kind": "ip", "value": expression.value}
        if isinstance(expression, FieldAccessNode):
            return {"kind": "field", "parts": list(expression.parts)}
        if isinstance(expression, TupleExpressionNode):
            return {"kind": "tuple", "items": [self._expr_to_value(item) for item in expression.items]}
        if isinstance(expression, UnaryExpressionNode):
            return {
                "kind": "unary",
                "operator": expression.operator,
                "operand": self._expr_to_value(expression.operand),
            }
        if isinstance(expression, BinaryExpressionNode):
            return {
                "kind": "binary",
                "operator": expression.operator,
                "left": self._expr_to_value(expression.left),
                "right": self._expr_to_value(expression.right),
            }
        if isinstance(expression, IndexExpressionNode):
            return {
                "kind": "index",
                "target": self._expr_to_value(expression.target),
                "index": self._expr_to_value(expression.index),
            }
        if isinstance(expression, SliceExpressionNode):
            return {
                "kind": "slice",
                "target": self._expr_to_value(expression.target),
                "start": self._expr_to_value(expression.start),
                "end": self._expr_to_value(expression.end),
            }
        if isinstance(expression, CallExpressionNode):
            return {
                "kind": "call",
                "callee": self._expr_to_value(expression.callee),
                "args": [self._expr_to_value(arg) for arg in expression.args],
            }
        return expression.to_dict()

    def _duplicate(
        self, code: str, kind: str, name: str, span: SourceSpan | None
    ) -> Diagnostic:
        return Diagnostic(
            code=code,
            message=f"Duplicate {kind} definition: {name}",
            severity=DiagnosticSeverity.ERROR,
            span=span,
        )

    def _unsupported_scope(self, kind: str, span: SourceSpan | None) -> Diagnostic:
        return Diagnostic(
            code="SEM030",
            message=f"{kind} declarations are not supported in this scope",
            severity=DiagnosticSeverity.ERROR,
            span=span,
        )


__all__ = ["ProgramCollector", "SemanticResult"]
