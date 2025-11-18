"""Profile management commands."""

import json
import sys
from pathlib import Path

import click

from ..core.credentials import CredentialProvider
from ..services.sso import SSOCredentialsProvider


@click.group()
def profile():
    """Profile operations (list, test, validate, info)."""
    pass


@profile.command()
@click.option("--sso", is_flag=True, help="Include SSO profiles")
@click.option("--json", "output_json", is_flag=True, help="Output as JSON")
@click.option("--count", is_flag=True, help="Show count only")
def list(sso, output_json, count):
    """List all AWS profiles."""
    try:
        cred_provider = CredentialProvider()
        profiles = cred_provider.list_profiles()

        if count:
            click.echo(len(profiles))
            return

        if output_json:
            click.echo(json.dumps(profiles, indent=2))
        else:
            if not profiles:
                click.echo("ℹ️  No AWS profiles found")
                click.echo(f"\n   Config file: ~/.aws/config")
                click.echo(f"   Credentials: ~/.aws/credentials")
                return

            click.echo(f"📋 Found {len(profiles)} AWS profile(s):\n")

            for profile_name in sorted(profiles):
                # Check if SSO profile
                config_path = Path.home() / ".aws" / "config"
                is_sso = False

                if config_path.exists():
                    with open(config_path) as f:
                        content = f.read()
                        if f"[profile {profile_name}]" in content:
                            section_start = content.find(f"[profile {profile_name}]")
                            next_section = content.find("[", section_start + 1)
                            section = content[
                                section_start : next_section if next_section != -1 else None
                            ]
                            is_sso = "sso_" in section

                icon = "🔐" if is_sso else "🔑"
                profile_type = "SSO" if is_sso else "Static"
                click.echo(f"   {icon} {profile_name:<30} ({profile_type})")

            click.echo(f"\n💡 Tip: Use 'aws-profile-bridge profile info <name>' for details")

    except Exception as e:
        click.echo(f"❌ Error listing profiles: {e}")
        sys.exit(1)


@profile.command()
@click.argument("profile_name")
@click.option("--json", "output_json", is_flag=True, help="Output as JSON")
def info(profile_name, output_json):
    """Show detailed information about a profile."""
    try:
        cred_provider = CredentialProvider()
        profiles = cred_provider.list_profiles()

        if profile_name not in profiles:
            click.echo(f"❌ Profile '{profile_name}' not found")
            click.echo(f"\n   Available profiles: {', '.join(sorted(profiles))}")
            sys.exit(1)

        # Read config and credentials
        config_path = Path.home() / ".aws" / "config"
        creds_path = Path.home() / ".aws" / "credentials"

        info_data = {"name": profile_name, "type": "static", "config": {}, "has_credentials": False}

        # Check config file
        if config_path.exists():
            with open(config_path) as f:
                content = f.read()

                # Find profile section
                for prefix in [f"[profile {profile_name}]", f"[{profile_name}]"]:
                    if prefix in content:
                        section_start = content.find(prefix)
                        next_section = content.find("[", section_start + 1)
                        section = content[section_start : next_section if next_section != -1 else None]

                        # Parse section
                        for line in section.split("\n")[1:]:
                            line = line.strip()
                            if "=" in line and not line.startswith("#"):
                                key, value = line.split("=", 1)
                                info_data["config"][key.strip()] = value.strip()

                        # Check if SSO
                        if any(k.startswith("sso_") for k in info_data["config"].keys()):
                            info_data["type"] = "sso"

        # Check credentials file
        if creds_path.exists():
            with open(creds_path) as f:
                content = f.read()
                if f"[{profile_name}]" in content:
                    info_data["has_credentials"] = True

        if output_json:
            click.echo(json.dumps(info_data, indent=2))
        else:
            click.echo(f"\n📋 Profile: {profile_name}")
            click.echo("=" * 60)

            type_icon = "🔐" if info_data["type"] == "sso" else "🔑"
            click.echo(f"\n   Type: {type_icon} {info_data['type'].upper()}")

            if info_data["config"]:
                click.echo(f"\n   Configuration:")
                for key, value in info_data["config"].items():
                    # Mask sensitive values
                    if "token" in key.lower() or "secret" in key.lower():
                        value = "***" + value[-4:] if len(value) > 4 else "****"
                    click.echo(f"      {key:<20} = {value}")

            click.echo(f"\n   Has Credentials: {'✅ Yes' if info_data['has_credentials'] else '❌ No'}")

            if info_data["type"] == "sso":
                click.echo(f"\n   💡 SSO Profile - Login with: aws sso login --profile {profile_name}")
            else:
                click.echo(f"\n   💡 Static Credentials Profile")

            click.echo()

    except Exception as e:
        click.echo(f"❌ Error getting profile info: {e}")
        sys.exit(1)


@profile.command()
@click.argument("profile_name")
def test(profile_name):
    """Test if a profile can generate console URLs."""
    click.echo(f"🧪 Testing profile: {profile_name}...")

    try:
        cred_provider = CredentialProvider()
        profiles = cred_provider.list_profiles()

        if profile_name not in profiles:
            click.echo(f"❌ Profile '{profile_name}' not found")
            sys.exit(1)

        # Try to load credentials
        click.echo(f"   1. Loading credentials...")
        credentials = cred_provider.get_credentials(profile_name)

        if not credentials:
            click.echo(f"   ❌ Failed to load credentials")
            sys.exit(1)

        click.echo(f"   ✅ Credentials loaded")

        # Check credential format
        click.echo(f"   2. Validating credential format...")
        required_keys = ["AccessKeyId", "SecretAccessKey"]
        missing = [k for k in required_keys if k not in credentials]

        if missing:
            click.echo(f"   ❌ Missing required fields: {', '.join(missing)}")
            sys.exit(1)

        click.echo(f"   ✅ Credential format valid")

        # Check if SSO and whether token is valid
        config_path = Path.home() / ".aws" / "config"
        is_sso = False

        if config_path.exists():
            with open(config_path) as f:
                content = f.read()
                if f"[profile {profile_name}]" in content:
                    section_start = content.find(f"[profile {profile_name}]")
                    next_section = content.find("[", section_start + 1)
                    section = content[section_start : next_section if next_section != -1 else None]
                    is_sso = "sso_" in section

        if is_sso:
            click.echo(f"   3. Checking SSO session...")
            # Check for SessionToken (indicates SSO session)
            if "SessionToken" in credentials:
                click.echo(f"   ✅ SSO session active")
            else:
                click.echo(f"   ⚠️  No SSO session token found")
                click.echo(f"      Run: aws sso login --profile {profile_name}")

        click.echo(f"\n✅ Profile '{profile_name}' is ready to use!")
        click.echo(f"\n💡 Test in extension: Open popup and search for '{profile_name}'")

    except Exception as e:
        click.echo(f"❌ Error testing profile: {e}")
        click.echo(f"\n💡 Troubleshooting:")
        click.echo(f"   • Check ~/.aws/config and ~/.aws/credentials")
        click.echo(f"   • For SSO: Run 'aws sso login --profile {profile_name}'")
        click.echo(f"   • Verify AWS CLI is installed: aws --version")
        sys.exit(1)


@profile.command()
def validate():
    """Validate all AWS profiles for common issues."""
    click.echo("🔍 Validating AWS profiles...\n")

    config_path = Path.home() / ".aws" / "config"
    creds_path = Path.home() / ".aws" / "credentials"

    issues = []
    warnings = []

    # Check if files exist
    if not config_path.exists():
        issues.append(f"Config file not found: {config_path}")

    if not creds_path.exists():
        warnings.append(f"Credentials file not found: {creds_path}")

    try:
        cred_provider = CredentialProvider()
        profiles = cred_provider.list_profiles()

        if not profiles:
            issues.append("No AWS profiles found")
        else:
            click.echo(f"   Found {len(profiles)} profile(s)")

            # Check each profile
            for profile_name in profiles:
                try:
                    credentials = cred_provider.get_credentials(profile_name)

                    if not credentials:
                        warnings.append(f"Profile '{profile_name}': Could not load credentials")
                    elif "AccessKeyId" not in credentials:
                        warnings.append(
                            f"Profile '{profile_name}': Missing AccessKeyId (might need SSO login)"
                        )

                except Exception as e:
                    warnings.append(f"Profile '{profile_name}': {str(e)}")

    except Exception as e:
        issues.append(f"Error reading profiles: {e}")

    # Report results
    click.echo()

    if issues:
        click.echo("❌ Issues Found:")
        for issue in issues:
            click.echo(f"   • {issue}")
        click.echo()

    if warnings:
        click.echo("⚠️  Warnings:")
        for warning in warnings:
            click.echo(f"   • {warning}")
        click.echo()

    if not issues and not warnings:
        click.echo("✅ All profiles are valid!")
        click.echo(f"\n💡 Test a profile: aws-profile-bridge profile test <name>")
    else:
        click.echo("💡 Troubleshooting:")
        click.echo("   • Verify AWS CLI installation: aws --version")
        click.echo("   • Check file permissions: ls -la ~/.aws/")
        click.echo("   • For SSO profiles: aws sso login --profile <name>")

        if issues:
            sys.exit(1)
