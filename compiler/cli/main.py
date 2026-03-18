"""CLI entrypoint for the unified compiler."""

from __future__ import annotations

import sys
from pathlib import Path


def main() -> int:
    """Main CLI entry. Placeholder for check, dump-ast, dump-ir, compile subcommands."""
    # TODO: add typer/argparse subcommands: check, dump-ast, dump-ir, compile
    print("ParaNet compiler CLI (placeholder)", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
