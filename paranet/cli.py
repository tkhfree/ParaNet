"""
ParaNet CLI - Command Line Interface
"""

import typer
from rich.console import Console
from rich.panel import Panel

app = typer.Typer(
    name="paranet",
    help="Multi-modal Programmable Network Infrastructure Agent",
    add_completion=False,
)
console = Console()


@app.command()
def version() -> None:
    """Show ParaNet version."""
    from paranet import __version__
    console.print(f"ParaNet version: [bold green]{__version__}[/bold green]")


@app.command()
def init(
    topology_file: str = typer.Option(
        None, "--topology", "-t", help="Path to topology configuration file"
    ),
) -> None:
    """Initialize ParaNet environment."""
    console.print(Panel.fit(
        "[bold blue]ParaNet[/bold blue] - Multi-modal Network Agent",
        subtitle="Initializing...",
    ))
    
    if topology_file:
        console.print(f"Loading topology from: {topology_file}")
    else:
        console.print("No topology file specified. Using default configuration.")
    
    console.print("[green]✓[/green] ParaNet initialized successfully!")


@app.command()
def compile(
    intent_file: str = typer.Argument(..., help="Path to intent DSL file"),
    output: str = typer.Option(
        "output/", "--output", "-o", help="Output directory for compiled configs"
    ),
    target: str = typer.Option(
        "all", "--target", "-t", help="Target backend (ip, ndn, geo, p4, all)"
    ),
) -> None:
    """Compile intent DSL to target configurations."""
    console.print(f"Compiling intent: [cyan]{intent_file}[/cyan]")
    console.print(f"Target backend: [yellow]{target}[/yellow]")
    console.print(f"Output directory: {output}")
    # TODO: Implement compilation logic
    console.print("[yellow]⚠[/yellow] Compilation not yet implemented")


@app.command()
def deploy(
    config_dir: str = typer.Argument(..., help="Directory containing compiled configs"),
    dry_run: bool = typer.Option(
        False, "--dry-run", "-n", help="Validate without deploying"
    ),
) -> None:
    """Deploy compiled configurations to network devices."""
    if dry_run:
        console.print("[yellow]Dry run mode[/yellow] - validating only")
    console.print(f"Deploying from: [cyan]{config_dir}[/cyan]")
    # TODO: Implement deployment logic
    console.print("[yellow]⚠[/yellow] Deployment not yet implemented")


@app.command()
def chat() -> None:
    """Start interactive LLM chat session for natural language network programming."""
    console.print(Panel.fit(
        "[bold blue]ParaNet Chat[/bold blue]\n"
        "Natural language interface for network programming\n"
        "Type [bold]exit[/bold] or [bold]quit[/bold] to exit",
    ))
    
    while True:
        try:
            user_input = console.input("[bold green]paranet>[/bold green] ")
            if user_input.lower() in ("exit", "quit", "q"):
                console.print("[yellow]Goodbye![/yellow]")
                break
            if not user_input.strip():
                continue
            
            # TODO: Integrate LLM agent
            console.print("[yellow]⚠[/yellow] LLM agent not yet implemented")
            console.print(f"You said: {user_input}")
            
        except KeyboardInterrupt:
            console.print("\n[yellow]Interrupted. Goodbye![/yellow]")
            break


@app.command()
def status() -> None:
    """Show current network status and topology."""
    console.print(Panel.fit(
        "[bold blue]Network Status[/bold blue]",
    ))
    # TODO: Implement status display
    console.print("[yellow]⚠[/yellow] Status display not yet implemented")


def main() -> None:
    """Main entry point for ParaNet CLI."""
    app()


if __name__ == "__main__":
    main()
