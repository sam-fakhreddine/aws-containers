"""CLI commands for token management."""

import json
import sys
from pathlib import Path

from ..auth.token_manager import TokenManager
from ..config import settings


def show_token() -> None:
    """Display the current API token."""
    config_file = settings.CONFIG_FILE

    if not config_file.exists():
        print("❌ No token found. Start the API server to generate one.")
        print(f"\nRun: aws-profile-bridge-api")
        sys.exit(1)

    try:
        with open(config_file, "r") as f:
            config = json.load(f)
            token = config.get("api_token")

            if not token:
                print("❌ Token not found in config file.")
                sys.exit(1)

            # Check if legacy format
            is_legacy = TokenManager.LEGACY_PATTERN.match(token) is not None
            is_new = TokenManager.NEW_PATTERN.match(token) is not None

            print("✅ Current API Token:")
            print(f"\n{token}\n")

            if is_new:
                print("✓ Format: New (awspc_...)")
                print("✓ Checksum: Valid")
            elif is_legacy:
                print("⚠️  Format: Legacy (deprecated)")
                print("⚠️  Recommendation: Run 'aws-profile-bridge-api token rotate' to upgrade")

            print(f"\nStored in: {config_file}")
            print("\nNext steps:")
            print("1. Copy the token above")
            print("2. Open your browser extension settings")
            print("3. Paste the token and click 'Save'")

    except Exception as e:
        print(f"❌ Error reading token: {e}")
        sys.exit(1)


def copy_token() -> None:
    """Copy the current API token to clipboard."""
    config_file = settings.CONFIG_FILE

    if not config_file.exists():
        print("❌ No token found. Start the API server to generate one.")
        sys.exit(1)

    try:
        with open(config_file, "r") as f:
            config = json.load(f)
            token = config.get("api_token")

            if not token:
                print("❌ Token not found in config file.")
                sys.exit(1)

        # Try to copy to clipboard
        try:
            import pyperclip

            pyperclip.copy(token)
            print("✅ Token copied to clipboard!")
            print("\nNext steps:")
            print("1. Open your browser extension settings")
            print("2. Paste (Ctrl+V / Cmd+V) the token")
            print("3. Click 'Save'")

        except ImportError:
            print("⚠️  pyperclip not installed. Showing token instead:\n")
            print(token)
            print("\nTo enable clipboard support:")
            print("  pip install pyperclip")

    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)


def rotate_token() -> None:
    """Generate and save a new API token."""
    config_file = settings.CONFIG_FILE

    try:
        manager = TokenManager(config_file)

        # Load existing token (if any)
        if config_file.exists():
            manager.load_or_create()
            old_token = manager._token
            print(f"Current token: {old_token[:10]}...{old_token[-6:]}")
        else:
            old_token = None
            print("No existing token found.")

        # Generate new token
        new_token = manager.rotate()

        print(f"\n✅ New token generated!")
        print(f"\n{new_token}\n")

        # Try to copy to clipboard
        try:
            import pyperclip

            pyperclip.copy(new_token)
            print("✅ Token copied to clipboard!")
        except ImportError:
            pass

        print("\n⚠️  IMPORTANT: Update your browser extension with the new token!")
        print("\nSteps:")
        print("1. Open browser extension settings")
        print("2. Paste the new token")
        print("3. Click 'Save'")

        if old_token:
            print("\n⚠️  The old token is now invalid.")

    except Exception as e:
        print(f"❌ Error rotating token: {e}")
        sys.exit(1)


def show_qr_code() -> None:
    """Display token as QR code for easy mobile/remote transfer."""
    config_file = settings.CONFIG_FILE

    if not config_file.exists():
        print("❌ No token found. Start the API server to generate one.")
        sys.exit(1)

    try:
        with open(config_file, "r") as f:
            config = json.load(f)
            token = config.get("api_token")

            if not token:
                print("❌ Token not found in config file.")
                sys.exit(1)

        # Try to generate QR code
        try:
            import qrcode

            qr = qrcode.QRCode(version=1, box_size=10, border=4)
            qr.add_data(token)
            qr.make(fit=True)

            print("\n✅ Scan this QR code with your mobile device:\n")
            qr.print_ascii(invert=True)

            print(f"\nToken: {token[:10]}...{token[-6:]}")

        except ImportError:
            print("⚠️  qrcode not installed. Showing token instead:\n")
            print(token)
            print("\nTo enable QR code support:")
            print("  pip install qrcode[pil]")

    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)


def setup_wizard() -> None:
    """Interactive setup wizard for first-time configuration."""
    config_file = settings.CONFIG_FILE

    print("=" * 60)
    print("AWS Profile Bridge - Setup Wizard")
    print("=" * 60)

    # Check if already configured
    if config_file.exists():
        try:
            with open(config_file, "r") as f:
                config = json.load(f)
                existing_token = config.get("api_token")

            if existing_token:
                print("\n⚠️  API token already exists.")
                print(f"Current token: {existing_token[:10]}...{existing_token[-6:]}")
                print("\nOptions:")
                print("  1. Show existing token")
                print("  2. Generate new token (invalidates old one)")
                print("  3. Exit")

                choice = input("\nChoice [1]: ").strip() or "1"

                if choice == "1":
                    show_token()
                    return
                elif choice == "2":
                    rotate_token()
                    return
                else:
                    print("Exiting.")
                    return
        except Exception:
            pass

    # Generate new token
    print("\n📝 Generating API token...")

    try:
        manager = TokenManager(config_file)
        token = manager.load_or_create()

        print("\n✅ Token generated successfully!")
        print(f"\n{token}\n")

        # Try to copy to clipboard
        try:
            import pyperclip

            pyperclip.copy(token)
            print("✅ Token copied to clipboard!")
        except ImportError:
            print("💡 Tip: Install pyperclip to auto-copy: pip install pyperclip")

        print("\n" + "=" * 60)
        print("Next Steps:")
        print("=" * 60)
        print("\n1. Start the API server:")
        print("   $ aws-profile-bridge-api")
        print("\n2. Configure the browser extension:")
        print("   • Open extension settings")
        print("   • Paste the token above")
        print("   • Click 'Save'")
        print("\n3. You're ready to go! 🚀")
        print("\n" + "=" * 60)

    except Exception as e:
        print(f"\n❌ Error during setup: {e}")
        sys.exit(1)


def main() -> None:
    """Main entry point for token CLI commands."""
    import argparse

    parser = argparse.ArgumentParser(
        description="AWS Profile Bridge Token Management",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Show token
    subparsers.add_parser("show", help="Display the current API token")

    # Copy token
    subparsers.add_parser("copy", help="Copy token to clipboard")

    # Rotate token
    subparsers.add_parser("rotate", help="Generate a new token")

    # QR code
    subparsers.add_parser("qr", help="Display token as QR code")

    # Setup wizard
    subparsers.add_parser("setup", help="Run interactive setup wizard")

    args = parser.parse_args()

    if args.command == "show":
        show_token()
    elif args.command == "copy":
        copy_token()
    elif args.command == "rotate":
        rotate_token()
    elif args.command == "qr":
        show_qr_code()
    elif args.command == "setup":
        setup_wizard()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
