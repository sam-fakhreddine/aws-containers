"""Token management commands (Click version)."""

import json
import sys
from pathlib import Path

import click

from ..auth.token_manager import TokenManager
from ..config import settings


@click.group()
def token():
    """Token management (show, copy, rotate, qr, setup)."""
    pass


@token.command()
def show():
    """Display the current API token."""
    config_file = settings.CONFIG_FILE

    if not config_file.exists():
        click.echo("❌ No token found. Start the API server to generate one.")
        click.echo(f"\nRun: aws-profile-bridge server start")
        sys.exit(1)

    try:
        with open(config_file, "r") as f:
            config = json.load(f)
            token = config.get("api_token")

            if not token:
                click.echo("❌ Token not found in config file.")
                sys.exit(1)

            # Check if legacy format
            is_legacy = TokenManager.LEGACY_PATTERN.match(token) is not None
            is_new = TokenManager.NEW_PATTERN.match(token) is not None

            click.echo("✅ Current API Token:")
            click.echo(f"\n{token}\n")

            if is_new:
                click.echo("✓ Format: New (awspc_...)")
                click.echo("✓ Checksum: Valid")
            elif is_legacy:
                click.echo("⚠️  Format: Legacy (deprecated)")
                click.echo("⚠️  Recommendation: Run 'aws-profile-bridge token rotate' to upgrade")

            click.echo(f"\nStored in: {config_file}")
            click.echo("\nNext steps:")
            click.echo("1. Copy the token above")
            click.echo("2. Open your browser extension settings")
            click.echo("3. Paste the token and click 'Save'")

    except Exception as e:
        click.echo(f"❌ Error reading token: {e}")
        sys.exit(1)


@token.command()
def copy():
    """Copy the current API token to clipboard."""
    config_file = settings.CONFIG_FILE

    if not config_file.exists():
        click.echo("❌ No token found. Start the API server to generate one.")
        sys.exit(1)

    try:
        with open(config_file, "r") as f:
            config = json.load(f)
            token = config.get("api_token")

            if not token:
                click.echo("❌ Token not found in config file.")
                sys.exit(1)

        # Try to copy to clipboard
        try:
            import pyperclip

            pyperclip.copy(token)
            click.echo("✅ Token copied to clipboard!")
            click.echo("\nNext steps:")
            click.echo("1. Open your browser extension settings")
            click.echo("2. Paste (Ctrl+V / Cmd+V) the token")
            click.echo("3. Click 'Save'")

        except ImportError:
            click.echo("⚠️  pyperclip not installed. Showing token instead:\n")
            click.echo(token)
            click.echo("\nTo enable clipboard support:")
            click.echo("  pip install 'aws-profile-bridge[cli]'")

    except Exception as e:
        click.echo(f"❌ Error: {e}")
        sys.exit(1)


@token.command()
def rotate():
    """Generate and save a new API token."""
    config_file = settings.CONFIG_FILE

    try:
        manager = TokenManager(config_file)

        # Load existing token (if any)
        if config_file.exists():
            manager.load_or_create()
            old_token = manager._token
            click.echo(f"Current token: {old_token[:10]}...{old_token[-6:]}")
        else:
            old_token = None
            click.echo("No existing token found.")

        # Generate new token
        new_token = manager.rotate()

        click.echo(f"\n✅ New token generated!")
        click.echo(f"\n{new_token}\n")

        # Try to copy to clipboard
        try:
            import pyperclip

            pyperclip.copy(new_token)
            click.echo("✅ Token copied to clipboard!")
        except ImportError:
            pass

        click.echo("\n⚠️  IMPORTANT: Update your browser extension with the new token!")
        click.echo("\nSteps:")
        click.echo("1. Open browser extension settings")
        click.echo("2. Paste the new token")
        click.echo("3. Click 'Save'")

        if old_token:
            click.echo("\n⚠️  The old token is now invalid.")

    except Exception as e:
        click.echo(f"❌ Error rotating token: {e}")
        sys.exit(1)


@token.command()
def qr():
    """Display token as QR code for easy mobile/remote transfer."""
    config_file = settings.CONFIG_FILE

    if not config_file.exists():
        click.echo("❌ No token found. Start the API server to generate one.")
        sys.exit(1)

    try:
        with open(config_file, "r") as f:
            config = json.load(f)
            token = config.get("api_token")

            if not token:
                click.echo("❌ Token not found in config file.")
                sys.exit(1)

        # Try to generate QR code
        try:
            import qrcode

            qr = qrcode.QRCode(version=1, box_size=10, border=4)
            qr.add_data(token)
            qr.make(fit=True)

            click.echo("\n✅ Scan this QR code with your mobile device:\n")
            qr.print_ascii(invert=True)

            click.echo(f"\nToken: {token[:10]}...{token[-6:]}")

        except ImportError:
            click.echo("⚠️  qrcode not installed. Showing token instead:\n")
            click.echo(token)
            click.echo("\nTo enable QR code support:")
            click.echo("  pip install 'aws-profile-bridge[cli]'")

    except Exception as e:
        click.echo(f"❌ Error: {e}")
        sys.exit(1)


@token.command()
def setup():
    """Interactive setup wizard for first-time configuration."""
    config_file = settings.CONFIG_FILE

    click.echo("=" * 60)
    click.echo("AWS Profile Bridge - Setup Wizard")
    click.echo("=" * 60)

    # Check if already configured
    if config_file.exists():
        try:
            with open(config_file, "r") as f:
                config = json.load(f)
                existing_token = config.get("api_token")

            if existing_token:
                click.echo("\n⚠️  API token already exists.")
                click.echo(f"Current token: {existing_token[:10]}...{existing_token[-6:]}")

                click.echo("\nOptions:")
                click.echo("  1. Show existing token")
                click.echo("  2. Generate new token (invalidates old one)")
                click.echo("  3. Exit")

                choice = click.prompt("\nChoice", type=int, default=1)

                if choice == 1:
                    ctx = click.get_current_context()
                    ctx.invoke(show)
                    return
                elif choice == 2:
                    ctx = click.get_current_context()
                    ctx.invoke(rotate)
                    return
                else:
                    click.echo("Exiting.")
                    return
        except Exception:
            pass

    # Generate new token
    click.echo("\n📝 Generating API token...")

    try:
        manager = TokenManager(config_file)
        token = manager.load_or_create()

        click.echo("\n✅ Token generated successfully!")
        click.echo(f"\n{token}\n")

        # Try to copy to clipboard
        try:
            import pyperclip

            pyperclip.copy(token)
            click.echo("✅ Token copied to clipboard!")
        except ImportError:
            click.echo("💡 Tip: Install pyperclip to auto-copy: pip install 'aws-profile-bridge[cli]'")

        click.echo("\n" + "=" * 60)
        click.echo("Next Steps:")
        click.echo("=" * 60)
        click.echo("\n1. Start the API server:")
        click.echo("   $ aws-profile-bridge server start")
        click.echo("\n2. Configure the browser extension:")
        click.echo("   • Open extension settings")
        click.echo("   • Paste the token above")
        click.echo("   • Click 'Save'")
        click.echo("\n3. You're ready to go! 🚀")
        click.echo("\n" + "=" * 60)

    except Exception as e:
        click.echo(f"\n❌ Error during setup: {e}")
        sys.exit(1)
