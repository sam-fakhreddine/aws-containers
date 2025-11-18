"""Configuration management commands."""

import json
import sys

import click

from ..config import settings


@click.group()
def config():
    """Configuration management (show, reset)."""
    pass


@config.command()
@click.option("--json", "output_json", is_flag=True, help="Output as JSON")
@click.option("--show-token", is_flag=True, help="Show full token (security risk!)")
def show(output_json, show_token):
    """Show current configuration."""
    config_file = settings.CONFIG_FILE

    if not config_file.exists():
        click.echo(f"ℹ️  No configuration file found")
        click.echo(f"   Run 'aws-profile-bridge token setup' to create one")
        return

    try:
        with open(config_file) as f:
            config_data = json.load(f)

        if output_json:
            if not show_token and "api_token" in config_data:
                token = config_data["api_token"]
                config_data["api_token"] = f"{token[:10]}...{token[-6:]}"

            click.echo(json.dumps(config_data, indent=2))
        else:
            click.echo(f"\n⚙️  Configuration")
            click.echo("=" * 60)

            click.echo(f"\nFile: {config_file}")

            if "api_token" in config_data:
                token = config_data["api_token"]

                if show_token:
                    click.echo(f"\n⚠️  API Token (SENSITIVE):")
                    click.echo(f"   {token}")
                else:
                    click.echo(f"\nAPI Token:")
                    click.echo(f"   {token[:10]}...{token[-6:]}")
                    click.echo(f"   (Use --show-token to reveal full token)")

                # Validate token format
                from ..auth.token_manager import TokenManager

                if TokenManager.validate_format(token):
                    if TokenManager.NEW_PATTERN.match(token):
                        click.echo(f"   Format: ✅ New (awspc_...)")
                    else:
                        click.echo(f"   Format: ⚠️  Legacy (should rotate)")
                else:
                    click.echo(f"   Format: ❌ Invalid")

            # Show other config options
            other_config = {k: v for k, v in config_data.items() if k != "api_token"}
            if other_config:
                click.echo(f"\nOther Settings:")
                for key, value in other_config.items():
                    click.echo(f"   {key}: {value}")

            click.echo(f"\n💡 Manage token: aws-profile-bridge token <command>")
            click.echo()

    except Exception as e:
        click.echo(f"❌ Error reading config: {e}")
        sys.exit(1)


@config.command()
@click.option("--force", is_flag=True, help="Don't ask for confirmation")
def reset(force):
    """Reset configuration to defaults (deletes config file)."""
    config_file = settings.CONFIG_FILE

    if not config_file.exists():
        click.echo(f"ℹ️  No configuration file to reset")
        return

    if not force:
        click.echo(f"⚠️  This will delete your current configuration:")
        click.echo(f"   File: {config_file}")
        click.echo(f"\n⚠️  Your API token will be lost!")
        click.echo(f"   The browser extension will need a new token.")

        if not click.confirm("\nAre you sure you want to reset?"):
            click.echo("Cancelled")
            return

    try:
        config_file.unlink()
        click.echo(f"✅ Configuration reset successfully")
        click.echo(f"\n📝 Next steps:")
        click.echo(f"   1. Restart API server to generate new token")
        click.echo(f"   2. Run: aws-profile-bridge token copy")
        click.echo(f"   3. Update browser extension with new token")

    except Exception as e:
        click.echo(f"❌ Error resetting config: {e}")
        sys.exit(1)


@config.command()
@click.argument("key")
@click.argument("value")
def set(key, value):
    """Set a configuration value."""
    config_file = settings.CONFIG_FILE

    # Don't allow setting sensitive keys directly
    if key == "api_token":
        click.echo(f"❌ Use 'aws-profile-bridge token' commands to manage the token")
        sys.exit(1)

    try:
        # Load existing config
        if config_file.exists():
            with open(config_file) as f:
                config_data = json.load(f)
        else:
            config_data = {}

        # Set new value
        config_data[key] = value

        # Save
        with open(config_file, "w") as f:
            json.dump(config_data, f, indent=2)

        config_file.chmod(0o600)

        click.echo(f"✅ Set {key} = {value}")

    except Exception as e:
        click.echo(f"❌ Error setting config: {e}")
        sys.exit(1)


@config.command()
@click.argument("key")
def get(key):
    """Get a configuration value."""
    config_file = settings.CONFIG_FILE

    if not config_file.exists():
        click.echo(f"❌ No configuration file found")
        sys.exit(1)

    try:
        with open(config_file) as f:
            config_data = json.load(f)

        if key in config_data:
            value = config_data[key]

            # Mask sensitive values
            if key == "api_token":
                click.echo(f"{value[:10]}...{value[-6:]}")
                click.echo(f"(Use 'aws-profile-bridge token show' for full value)")
            else:
                click.echo(value)
        else:
            click.echo(f"❌ Key '{key}' not found in configuration")
            sys.exit(1)

    except Exception as e:
        click.echo(f"❌ Error reading config: {e}")
        sys.exit(1)
