"""Cache management commands."""

import shutil
from pathlib import Path

import click


@click.group()
def cache():
    """Cache management (clear, show, refresh)."""
    pass


@cache.command()
@click.option("--sso", is_flag=True, help="Clear SSO cache only")
@click.option("--all", "clear_all", is_flag=True, help="Clear all caches")
@click.option("--force", is_flag=True, help="Don't ask for confirmation")
def clear(sso, clear_all, force):
    """Clear cached data."""
    sso_cache = Path.home() / ".aws" / "sso" / "cache"
    cli_cache = Path.home() / ".aws" / "cli" / "cache"

    if not sso and not clear_all:
        click.echo("❌ Specify what to clear: --sso or --all")
        click.echo("   aws-profile-bridge cache clear --sso")
        click.echo("   aws-profile-bridge cache clear --all")
        return

    if not force:
        if clear_all:
            message = "Clear all AWS caches (SSO + CLI)?"
        else:
            message = "Clear SSO cache?"

        if not click.confirm(f"⚠️  {message}"):
            click.echo("Cancelled")
            return

    cleared = []

    # Clear SSO cache
    if sso or clear_all:
        if sso_cache.exists():
            count = len(list(sso_cache.glob("*.json")))
            for file in sso_cache.glob("*.json"):
                file.unlink()
            cleared.append(f"SSO cache ({count} file(s))")

    # Clear CLI cache
    if clear_all:
        if cli_cache.exists():
            shutil.rmtree(cli_cache)
            cli_cache.mkdir(parents=True)
            cleared.append("CLI cache")

    if cleared:
        click.echo(f"✅ Cleared: {', '.join(cleared)}")
        click.echo(f"\n💡 SSO profiles will need to re-login: aws sso login --profile <name>")
    else:
        click.echo(f"ℹ️  No cache files found to clear")


@cache.command()
@click.option("--json", "output_json", is_flag=True, help="Output as JSON")
def show(output_json):
    """Show cache information."""
    import json
    from datetime import datetime

    sso_cache = Path.home() / ".aws" / "sso" / "cache"
    cli_cache = Path.home() / ".aws" / "cli" / "cache"

    cache_info = {"sso": {}, "cli": {}}

    # Check SSO cache
    if sso_cache.exists():
        sso_files = list(sso_cache.glob("*.json"))
        cache_info["sso"]["count"] = len(sso_files)
        cache_info["sso"]["files"] = []

        for file in sso_files:
            try:
                with open(file) as f:
                    data = json.load(f)

                cache_info["sso"]["files"].append(
                    {
                        "name": file.name,
                        "size": file.stat().st_size,
                        "modified": datetime.fromtimestamp(file.stat().st_mtime).isoformat(),
                        "expires": data.get("expiresAt"),
                    }
                )
            except Exception:
                pass
    else:
        cache_info["sso"]["count"] = 0

    # Check CLI cache
    if cli_cache.exists():
        cli_files = list(cli_cache.glob("*.json"))
        cache_info["cli"]["count"] = len(cli_files)
        cache_info["cli"]["path"] = str(cli_cache)
    else:
        cache_info["cli"]["count"] = 0

    if output_json:
        click.echo(json.dumps(cache_info, indent=2))
    else:
        click.echo("\n📦 Cache Information")
        click.echo("=" * 60)

        # SSO Cache
        click.echo(f"\nSSO Cache:")
        if cache_info["sso"]["count"] > 0:
            click.echo(f"   Files: {cache_info['sso']['count']}")
            click.echo(f"   Location: {sso_cache}")

            for file in cache_info["sso"]["files"][:5]:  # Show first 5
                status = "❌ Expired" if file.get("expires") else "✅ Active"
                click.echo(f"      • {file['name'][:30]:<30} {status}")

            if len(cache_info["sso"]["files"]) > 5:
                click.echo(f"      ...and {len(cache_info['sso']['files']) - 5} more")
        else:
            click.echo(f"   ℹ️  No SSO cache files")

        # CLI Cache
        click.echo(f"\nCLI Cache:")
        if cache_info["cli"]["count"] > 0:
            click.echo(f"   Files: {cache_info['cli']['count']}")
            click.echo(f"   Location: {cli_cache}")
        else:
            click.echo(f"   ℹ️  No CLI cache files")

        click.echo(f"\n💡 Clear cache: aws-profile-bridge cache clear --sso")
        click.echo()


@cache.command()
@click.argument("profile_name", required=False)
def refresh(profile_name):
    """Refresh SSO session for a profile."""
    import subprocess

    if not profile_name:
        click.echo("❌ Please specify a profile name")
        click.echo("   aws-profile-bridge cache refresh <profile-name>")
        return

    click.echo(f"🔄 Refreshing SSO session for profile: {profile_name}")

    try:
        # Run aws sso login
        result = subprocess.run(
            ["aws", "sso", "login", "--profile", profile_name],
            capture_output=False,  # Show interactive prompts
        )

        if result.returncode == 0:
            click.echo(f"\n✅ SSO session refreshed successfully!")
            click.echo(f"💡 Profile '{profile_name}' is now ready to use")
        else:
            click.echo(f"\n❌ Failed to refresh SSO session")
            click.echo(f"   Check that profile '{profile_name}' is an SSO profile")

    except FileNotFoundError:
        click.echo(f"\n❌ AWS CLI not found")
        click.echo(f"   Install: https://aws.amazon.com/cli/")
    except Exception as e:
        click.echo(f"\n❌ Error: {e}")
