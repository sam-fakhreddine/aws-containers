"""Diagnostic and troubleshooting commands."""

import json
import sys
from pathlib import Path

import click
import httpx

from ..config import settings


@click.group()
def diagnose():
    """Diagnostics and troubleshooting commands."""
    pass


@diagnose.command()
@click.option("--json", "output_json", is_flag=True, help="Output as JSON")
def health(output_json):
    """Check overall system health."""
    results = {
        "server": {"status": "unknown"},
        "config": {"status": "unknown"},
        "profiles": {"status": "unknown"},
        "extension": {"status": "unknown"},
    }

    # 1. Check server
    try:
        response = httpx.get(f"http://127.0.0.1:{settings.PORT}/health", timeout=2)
        if response.status_code == 200:
            results["server"]["status"] = "ok"
            results["server"]["message"] = "Server is running"
        else:
            results["server"]["status"] = "error"
            results["server"]["message"] = f"Server returned status {response.status_code}"
    except httpx.ConnectError:
        results["server"]["status"] = "error"
        results["server"]["message"] = "Server is not running"
    except Exception as e:
        results["server"]["status"] = "error"
        results["server"]["message"] = str(e)

    # 2. Check config file
    config_file = settings.CONFIG_FILE
    if config_file.exists():
        try:
            with open(config_file) as f:
                config = json.load(f)
                if config.get("api_token"):
                    results["config"]["status"] = "ok"
                    results["config"]["message"] = "Token configured"
                else:
                    results["config"]["status"] = "warning"
                    results["config"]["message"] = "No token in config"
        except Exception as e:
            results["config"]["status"] = "error"
            results["config"]["message"] = f"Config file error: {e}"
    else:
        results["config"]["status"] = "warning"
        results["config"]["message"] = "Config file not found (run server to create)"

    # 3. Check AWS profiles
    from ..core.credentials import CredentialProvider

    try:
        cred_provider = CredentialProvider()
        profiles = cred_provider.list_profiles()

        if profiles:
            results["profiles"]["status"] = "ok"
            results["profiles"]["message"] = f"{len(profiles)} profile(s) found"
            results["profiles"]["count"] = len(profiles)
        else:
            results["profiles"]["status"] = "warning"
            results["profiles"]["message"] = "No AWS profiles found"

    except Exception as e:
        results["profiles"]["status"] = "error"
        results["profiles"]["message"] = str(e)

    # 4. Check if extension can connect
    if results["server"]["status"] == "ok" and results["config"]["status"] == "ok":
        try:
            with open(config_file) as f:
                config = json.load(f)
                token = config.get("api_token")

            response = httpx.post(
                f"http://127.0.0.1:{settings.PORT}/profiles",
                headers={"X-API-Token": token},
                timeout=5,
            )

            if response.status_code == 200:
                results["extension"]["status"] = "ok"
                results["extension"]["message"] = "Extension can connect"
            else:
                results["extension"]["status"] = "error"
                results["extension"]["message"] = f"Auth failed: {response.status_code}"

        except Exception as e:
            results["extension"]["status"] = "error"
            results["extension"]["message"] = str(e)
    else:
        results["extension"]["status"] = "skipped"
        results["extension"]["message"] = "Server or config not ready"

    # Output results
    if output_json:
        click.echo(json.dumps(results, indent=2))
    else:
        click.echo("\n🔍 AWS Profile Bridge - Health Check")
        click.echo("=" * 60)

        overall_status = all(
            r["status"] in ["ok", "skipped"] for r in results.values()
        )

        # Server
        status_icon = {"ok": "✅", "warning": "⚠️ ", "error": "❌", "skipped": "⏭️ "}[
            results["server"]["status"]
        ]
        click.echo(f"\n{status_icon} Server: {results['server']['message']}")

        # Config
        status_icon = {"ok": "✅", "warning": "⚠️ ", "error": "❌"}[results["config"]["status"]]
        click.echo(f"{status_icon} Config: {results['config']['message']}")

        # Profiles
        status_icon = {"ok": "✅", "warning": "⚠️ ", "error": "❌"}[results["profiles"]["status"]]
        click.echo(f"{status_icon} Profiles: {results['profiles']['message']}")

        # Extension
        status_icon = {"ok": "✅", "warning": "⚠️ ", "error": "❌", "skipped": "⏭️ "}[
            results["extension"]["status"]
        ]
        click.echo(f"{status_icon} Extension: {results['extension']['message']}")

        click.echo("\n" + "=" * 60)

        if overall_status:
            click.echo("✅ All systems operational!")
        else:
            click.echo("⚠️  Some issues detected - see above for details")
            click.echo("\n💡 Quick fixes:")

            if results["server"]["status"] != "ok":
                click.echo("   • Start server: aws-profile-bridge server start")

            if results["config"]["status"] != "ok":
                click.echo("   • Setup token: aws-profile-bridge token setup")

            if results["profiles"]["status"] != "ok":
                click.echo("   • Configure AWS: aws configure")
                click.echo("   • Or setup SSO: aws configure sso")

        click.echo()

    if not overall_status:
        sys.exit(1)


@diagnose.command()
def verify():
    """Verify complete setup (interactive)."""
    click.echo("\n🔍 AWS Profile Bridge - Setup Verification")
    click.echo("=" * 60)

    all_ok = True

    # Step 1: AWS CLI
    click.echo("\n1️⃣  Checking AWS CLI...")
    try:
        import subprocess

        result = subprocess.run(["aws", "--version"], capture_output=True, text=True)
        if result.returncode == 0:
            version = result.stdout.strip()
            click.echo(f"   ✅ AWS CLI installed: {version}")
        else:
            click.echo(f"   ❌ AWS CLI check failed")
            all_ok = False
    except FileNotFoundError:
        click.echo(f"   ❌ AWS CLI not installed")
        click.echo(f"      Install: https://aws.amazon.com/cli/")
        all_ok = False

    # Step 2: AWS Profiles
    click.echo("\n2️⃣  Checking AWS profiles...")
    from ..core.credentials import CredentialProvider

    try:
        cred_provider = CredentialProvider()
        profiles = cred_provider.list_profiles()

        if profiles:
            click.echo(f"   ✅ Found {len(profiles)} profile(s): {', '.join(list(profiles)[:3])}")
            if len(profiles) > 3:
                click.echo(f"      ...and {len(profiles) - 3} more")
        else:
            click.echo(f"   ⚠️  No profiles found")
            click.echo(f"      Setup: aws configure")
            all_ok = False

    except Exception as e:
        click.echo(f"   ❌ Error: {e}")
        all_ok = False

    # Step 3: API Token
    click.echo("\n3️⃣  Checking API token...")
    config_file = settings.CONFIG_FILE

    if config_file.exists():
        try:
            with open(config_file) as f:
                config = json.load(f)
                token = config.get("api_token")

                if token:
                    token_preview = f"{token[:10]}...{token[-6:]}"
                    click.echo(f"   ✅ Token configured: {token_preview}")

                    # Validate format
                    from ..auth.token_manager import TokenManager

                    if TokenManager.validate_format(token):
                        if TokenManager.NEW_PATTERN.match(token):
                            click.echo(f"      Format: New (awspc_..._...) ✓")
                        else:
                            click.echo(f"      Format: Legacy (should rotate)")
                    else:
                        click.echo(f"      ⚠️  Invalid format")

                else:
                    click.echo(f"   ❌ No token in config")
                    click.echo(f"      Run: aws-profile-bridge token setup")
                    all_ok = False

        except Exception as e:
            click.echo(f"   ❌ Config error: {e}")
            all_ok = False
    else:
        click.echo(f"   ⚠️  No config file (will be created when server starts)")

    # Step 4: Server
    click.echo("\n4️⃣  Checking API server...")
    try:
        response = httpx.get(f"http://127.0.0.1:{settings.PORT}/health", timeout=2)
        if response.status_code == 200:
            data = response.json()
            click.echo(f"   ✅ Server running: {data.get('status', 'ok')}")
        else:
            click.echo(f"   ❌ Server returned: {response.status_code}")
            all_ok = False
    except httpx.ConnectError:
        click.echo(f"   ⏹️  Server not running")
        click.echo(f"      Start: aws-profile-bridge server start")
        all_ok = False
    except Exception as e:
        click.echo(f"   ❌ Error: {e}")
        all_ok = False

    # Step 5: Extension
    click.echo("\n5️⃣  Checking browser extension...")
    click.echo(f"   ℹ️  Manual check required:")
    click.echo(f"      1. Open browser extension")
    click.echo(f"      2. Verify profiles appear")
    click.echo(f"      3. Test opening a profile")

    # Summary
    click.echo("\n" + "=" * 60)

    if all_ok:
        click.echo("✅ Setup verification complete - all systems ready!")
        click.echo("\n📖 Next steps:")
        click.echo("   • Ensure server is running: aws-profile-bridge server start")
        click.echo("   • Configure extension with token")
        click.echo("   • Open extension popup and test profile access")
    else:
        click.echo("⚠️  Setup incomplete - address issues above")
        click.echo("\n📖 Setup guide:")
        click.echo("   1. Install AWS CLI: https://aws.amazon.com/cli/")
        click.echo("   2. Configure profiles: aws configure")
        click.echo("   3. Setup token: aws-profile-bridge token setup")
        click.echo("   4. Start server: aws-profile-bridge server start")
        click.echo("   5. Install browser extension")
        click.echo("   6. Configure extension with token")

    click.echo()

    if not all_ok:
        sys.exit(1)


@diagnose.command()
def env():
    """Show environment information."""
    import platform
    import sys as python_sys

    click.echo("\n🔍 Environment Information")
    click.echo("=" * 60)

    click.echo(f"\nSystem:")
    click.echo(f"   OS: {platform.system()} {platform.release()}")
    click.echo(f"   Python: {python_sys.version.split()[0]}")
    click.echo(f"   Platform: {platform.platform()}")

    click.echo(f"\nPaths:")
    click.echo(f"   Config: {settings.CONFIG_FILE}")
    click.echo(f"   Logs: {settings.LOG_FILE}")
    click.echo(f"   AWS Config: ~/.aws/config")
    click.echo(f"   AWS Credentials: ~/.aws/credentials")

    click.echo(f"\nSettings:")
    click.echo(f"   Host: {settings.HOST}")
    click.echo(f"   Port: {settings.PORT}")
    click.echo(f"   Max Attempts: {settings.MAX_ATTEMPTS}")
    click.echo(f"   Window: {settings.WINDOW_SECONDS}s")

    click.echo(f"\nFile Status:")

    for path_name, path in [
        ("Config file", settings.CONFIG_FILE),
        ("Log file", settings.LOG_FILE),
        ("AWS config", Path.home() / ".aws" / "config"),
        ("AWS credentials", Path.home() / ".aws" / "credentials"),
    ]:
        if path.exists():
            size = path.stat().st_size
            size_str = f"{size:,} bytes" if size < 1024 else f"{size/1024:.1f} KB"
            click.echo(f"   {path_name}: ✅ ({size_str})")
        else:
            click.echo(f"   {path_name}: ❌ Not found")

    click.echo()
