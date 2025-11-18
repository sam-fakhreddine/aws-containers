"""Server management commands."""

import os
import signal
import subprocess
import sys
import time
from pathlib import Path

import click
import psutil

from ..config import settings


@click.group()
def server():
    """Server management commands (start, stop, status, restart, logs)."""
    pass


def find_server_process():
    """Find the running API server process."""
    for proc in psutil.process_iter(["pid", "name", "cmdline"]):
        try:
            cmdline = proc.info["cmdline"]
            if cmdline and "aws_profile_bridge" in " ".join(cmdline):
                if "app.py" in " ".join(cmdline) or "app:main" in " ".join(cmdline):
                    return proc
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    return None


@server.command()
@click.option("--port", default=10999, help="Port to run on (default: 10999)")
@click.option("--host", default="127.0.0.1", help="Host to bind to (default: 127.0.0.1)")
@click.option("--reload", is_flag=True, help="Enable auto-reload (development mode)")
@click.option("--daemon", is_flag=True, help="Run in background as daemon")
def start(port, host, reload, daemon):
    """Start the API server."""
    # Check if already running
    proc = find_server_process()
    if proc:
        click.echo(f"⚠️  Server already running (PID: {proc.pid})")
        click.echo(f"   Use 'aws-profile-bridge server stop' to stop it first")
        sys.exit(1)

    click.echo("🚀 Starting AWS Profile Bridge API server...")
    click.echo(f"   Host: {host}")
    click.echo(f"   Port: {port}")

    if daemon:
        click.echo(f"   Mode: Background (daemon)")
        # Start as background process
        subprocess.Popen(
            [sys.executable, "-m", "aws_profile_bridge.app"],
            env={**os.environ, "HOST": host, "PORT": str(port)},
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True,
        )
        time.sleep(2)  # Give it time to start
        proc = find_server_process()
        if proc:
            click.echo(f"\n✅ Server started successfully (PID: {proc.pid})")
            click.echo(f"   View logs: aws-profile-bridge server logs")
        else:
            click.echo("\n❌ Failed to start server")
            sys.exit(1)
    else:
        click.echo(f"   Mode: Foreground (Ctrl+C to stop)")
        click.echo(f"\n📝 Logs: {settings.LOG_FILE}")
        click.echo()

        # Start in foreground
        env = {**os.environ, "HOST": host, "PORT": str(port)}
        if reload:
            env["ENV"] = "development"

        try:
            subprocess.run(
                [sys.executable, "-m", "aws_profile_bridge.app"],
                env=env,
            )
        except KeyboardInterrupt:
            click.echo("\n\n⏹️  Server stopped")


@server.command()
@click.option("--force", is_flag=True, help="Force stop (SIGKILL)")
def stop(force):
    """Stop the API server."""
    proc = find_server_process()

    if not proc:
        click.echo("ℹ️  Server is not running")
        return

    click.echo(f"⏹️  Stopping server (PID: {proc.pid})...")

    try:
        if force:
            proc.kill()  # SIGKILL
            click.echo("   Sent SIGKILL (force stop)")
        else:
            proc.terminate()  # SIGTERM
            click.echo("   Sent SIGTERM (graceful stop)")

        # Wait for process to stop
        proc.wait(timeout=5)
        click.echo("✅ Server stopped successfully")

    except psutil.TimeoutExpired:
        click.echo("⚠️  Server didn't stop gracefully, forcing...")
        proc.kill()
        proc.wait(timeout=5)
        click.echo("✅ Server stopped (forced)")
    except Exception as e:
        click.echo(f"❌ Error stopping server: {e}")
        sys.exit(1)


@server.command()
def restart():
    """Restart the API server."""
    click.echo("🔄 Restarting server...")

    # Stop if running
    proc = find_server_process()
    if proc:
        click.echo(f"   Stopping current server (PID: {proc.pid})...")
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except psutil.TimeoutExpired:
            proc.kill()

    # Start new server
    click.echo("   Starting new server...")
    subprocess.Popen(
        [sys.executable, "-m", "aws_profile_bridge.app"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
    )

    time.sleep(2)
    proc = find_server_process()
    if proc:
        click.echo(f"\n✅ Server restarted successfully (PID: {proc.pid})")
    else:
        click.echo("\n❌ Failed to restart server")
        sys.exit(1)


@server.command()
@click.option("--json", "output_json", is_flag=True, help="Output as JSON")
def status(output_json):
    """Check server status."""
    proc = find_server_process()

    if output_json:
        import json

        if proc:
            status_data = {
                "running": True,
                "pid": proc.pid,
                "memory_mb": proc.memory_info().rss / 1024 / 1024,
                "cpu_percent": proc.cpu_percent(),
            }
        else:
            status_data = {"running": False}

        click.echo(json.dumps(status_data, indent=2))
    else:
        if proc:
            mem_mb = proc.memory_info().rss / 1024 / 1024
            cpu = proc.cpu_percent()

            click.echo("✅ Server Status: RUNNING")
            click.echo(f"   PID: {proc.pid}")
            click.echo(f"   Memory: {mem_mb:.1f} MB")
            click.echo(f"   CPU: {cpu:.1f}%")
            click.echo(f"   Endpoint: http://127.0.0.1:{settings.PORT}")
            click.echo(f"   Logs: {settings.LOG_FILE}")
        else:
            click.echo("⏹️  Server Status: STOPPED")
            click.echo(f"   Start with: aws-profile-bridge server start")


@server.command()
@click.option("-f", "--follow", is_flag=True, help="Follow log output (tail -f)")
@click.option("-n", "--lines", default=50, help="Number of lines to show (default: 50)")
@click.option("--level", type=click.Choice(["INFO", "WARNING", "ERROR"]), help="Filter by log level")
def logs(follow, lines, level):
    """View server logs."""
    log_file = settings.LOG_FILE

    if not log_file.exists():
        click.echo(f"❌ Log file not found: {log_file}")
        click.echo(f"   Start the server first: aws-profile-bridge server start")
        sys.exit(1)

    if follow:
        click.echo(f"📝 Following logs from {log_file} (Ctrl+C to stop)...")
        click.echo()
        try:
            subprocess.run(["tail", "-f", str(log_file)])
        except KeyboardInterrupt:
            click.echo("\n\n⏹️  Stopped following logs")
    else:
        click.echo(f"📝 Last {lines} lines from {log_file}:")
        click.echo()

        with open(log_file, "r") as f:
            all_lines = f.readlines()

        # Filter by level if specified
        if level:
            all_lines = [line for line in all_lines if f"| {level}" in line]

        # Show last N lines
        for line in all_lines[-lines:]:
            click.echo(line.rstrip())
