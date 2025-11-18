"""Main CLI entry point using Click."""

import click

from . import server_commands
from . import token_commands_click
from . import profile_commands
from . import config_commands
from . import diagnose_commands
from . import cache_commands


@click.group()
@click.version_option(version="2.0.0", prog_name="aws-profile-bridge")
@click.pass_context
def cli(ctx):
    """
    AWS Profile Bridge - Secure AWS profile management with container isolation.

    Manage AWS profiles, tokens, and the API server from the command line.
    """
    ctx.ensure_object(dict)


# Register command groups
cli.add_command(server_commands.server)
cli.add_command(token_commands_click.token)
cli.add_command(profile_commands.profile)
cli.add_command(config_commands.config)
cli.add_command(diagnose_commands.diagnose)
cli.add_command(cache_commands.cache)


def main():
    """Main entry point."""
    cli(obj={})


if __name__ == "__main__":
    main()
