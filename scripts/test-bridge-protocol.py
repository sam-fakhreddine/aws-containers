#!/usr/bin/env python3
"""
Test the bridge with proper native messaging protocol.
This will actually invoke the bridge and show output.
"""
import struct
import subprocess
import json
import sys
import os
from pathlib import Path


def send_message(process, message):
    """Send a message using native messaging protocol."""
    message_json = json.dumps(message)
    message_bytes = message_json.encode("utf-8")
    length_bytes = struct.pack("I", len(message_bytes))

    process.stdin.write(length_bytes)
    process.stdin.write(message_bytes)
    process.stdin.flush()
    print(f"→ Sent: {message_json}")


def read_message(process):
    """Read a message using native messaging protocol."""
    # Read 4-byte length
    length_bytes = process.stdout.read(4)
    if len(length_bytes) < 4:
        return None

    message_length = struct.unpack("I", length_bytes)[0]

    # Read message
    message_bytes = process.stdout.read(message_length)
    if len(message_bytes) < message_length:
        return None

    message = json.loads(message_bytes.decode("utf-8"))
    print(f"← Received: {json.dumps(message, indent=2)}")
    return message


def main():
    wrapper_path = Path.home() / ".local" / "bin" / "aws_profile_bridge"

    if not wrapper_path.exists():
        print(f"✗ Wrapper script not found: {wrapper_path}")
        print("  Run: ./install.sh --dev")
        sys.exit(1)

    print("=" * 60)
    print("Testing AWS Profile Bridge with Native Messaging Protocol")
    print("=" * 60)
    print()

    # Set DEBUG environment variable
    env = os.environ.copy()
    env["DEBUG"] = "1"

    print(f"Starting bridge: {wrapper_path}")
    print(f"Debug logging: ENABLED")
    print()

    try:
        # Start the bridge process
        process = subprocess.Popen(
            [str(wrapper_path)],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=env,
        )

        print("Bridge process started (PID: {})".format(process.pid))
        print()

        # Send getProfiles request
        print("Test 1: Getting profiles (fast mode)")
        print("-" * 60)
        send_message(process, {"action": "getProfiles"})

        # Read response
        response = read_message(process)

        if response:
            if response.get("action") == "profileList":
                profiles = response.get("profiles", [])
                print(f"\n✓ Success! Got {len(profiles)} profiles")

                # Show summary
                sso_count = sum(1 for p in profiles if p.get("is_sso"))
                cred_count = len(profiles) - sso_count
                print(f"  • SSO profiles: {sso_count}")
                print(f"  • Credential profiles: {cred_count}")

                # Show first few profiles
                print("\nFirst 3 profiles:")
                for i, profile in enumerate(profiles[:3]):
                    profile_type = "SSO" if profile.get("is_sso") else "CREDS"
                    print(f"  {i+1}. {profile['name']} [{profile_type}]")
            elif response.get("action") == "error":
                print(f"\n✗ Error: {response.get('message')}")
        else:
            print("\n✗ No response received")

        print()
        print("-" * 60)
        print()

        # Terminate process
        process.stdin.close()
        process.wait(timeout=5)

        # Check for stderr output
        stderr_output = process.stderr.read().decode("utf-8")
        if stderr_output:
            print("⚠ stderr output (should be empty for native messaging):")
            print(stderr_output)
            print()

        print("=" * 60)
        print("✓ Test completed")
        print()
        print("To see debug logs:")
        print(f"  tail -f ~/.aws/logs/aws_profile_bridge.log")
        print()

    except subprocess.TimeoutExpired:
        print("\n✗ Process timed out")
        process.kill()
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
        process.kill()
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
