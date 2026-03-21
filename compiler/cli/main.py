"""CLI entrypoint for the unified compiler."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(prog="paranet-compiler", description="ParaNet unified compiler")
    sub = parser.add_subparsers(dest="command")

    pipe = sub.add_parser("pipeline", help="Run MVP pipeline (PNE + optional topology -> artifacts)")
    pipe.add_argument("input", type=Path, help="Input .pne file")
    pipe.add_argument(
        "--topology",
        type=Path,
        default=None,
        help="Topology JSON (nodes/links); must match intent node ids for validation",
    )
    pipe.add_argument(
        "-o",
        "--output",
        type=Path,
        required=True,
        help="Output directory for manifest.json and per-node program.p4 / entries.json",
    )
    pipe.add_argument(
        "--target",
        choices=("bmv2", "tofino", "stub"),
        default=None,
        help="可选：强制所有节点使用同一后端；省略则按拓扑节点 capabilities.dataPlaneTarget 分别生成",
    )

    args = parser.parse_args()
    if args.command is None:
        parser.print_help()
        return 0

    if args.command == "pipeline":
        from compiler.ir.common import DiagnosticSeverity
        from compiler.pipeline import compile_pipeline

        text = args.input.read_text(encoding="utf-8")
        topo = None
        if args.topology is not None:
            topo = json.loads(args.topology.read_text(encoding="utf-8"))

        result = compile_pipeline(
            text,
            topology_snapshot=topo,
            file_name=str(args.input),
            output_dir=args.output,
            override_target=args.target,
        )

        if any(d.severity == DiagnosticSeverity.ERROR for d in result.diagnostics):
            for d in result.diagnostics:
                print(f"{d.code}: {d.message}", file=sys.stderr)
            return 1

        print(f"Wrote manifest: {result.artifacts.get('manifest_path', args.output / 'manifest.json')}")
        return 0

    return 0


if __name__ == "__main__":
    sys.exit(main())
