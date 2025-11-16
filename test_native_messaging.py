#!/usr/bin/env python3
"""
Test script for native messaging with proper binary format
"""
import struct
import json
import sys
import os

# Set PYTHONPATH to find the module
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'native-messaging', 'src'))

from aws_profile_bridge.aws_profile_bridge import main

def send_message(message_dict):
    """Send a message in native messaging format to the bridge."""
    # Encode message as JSON
    message = json.dumps(message_dict).encode('utf-8')

    # Write message length (4 bytes, little-endian)
    sys.stdout.buffer.write(struct.pack('I', len(message)))

    # Write the message itself
    sys.stdout.buffer.write(message)
    sys.stdout.buffer.flush()

def read_message():
    """Read a message in native messaging format from the bridge."""
    # Read message length (4 bytes, little-endian)
    raw_length = sys.stdin.buffer.read(4)
    if len(raw_length) == 0:
        return None

    message_length = struct.unpack('I', raw_length)[0]

    # Read the message
    message = sys.stdin.buffer.read(message_length).decode('utf-8')

    return json.loads(message)

if __name__ == '__main__':
    # Test with getProfiles action
    print("Testing native messaging host...", file=sys.stderr)
    print("", file=sys.stderr)

    # Create a subprocess to run the bridge
    import subprocess

    # Prepare the message
    message = {"action": "getProfiles"}
    encoded_message = json.dumps(message).encode('utf-8')

    # Pack with length prefix (native messaging format)
    length = struct.pack('I', len(encoded_message))

    # Run the bridge
    proc = subprocess.Popen(
        [sys.executable, '-m', 'aws_profile_bridge'],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd=os.path.join(os.path.dirname(__file__), 'native-messaging'),
        env={**os.environ, 'PYTHONPATH': 'src'}
    )

    # Send message
    proc.stdin.write(length + encoded_message)
    proc.stdin.flush()
    proc.stdin.close()

    # Read response length
    response_length_bytes = proc.stdout.read(4)
    if len(response_length_bytes) == 4:
        response_length = struct.unpack('I', response_length_bytes)[0]

        # Read response
        response_bytes = proc.stdout.read(response_length)
        response = json.loads(response_bytes.decode('utf-8'))

        print("Response received:", file=sys.stderr)
        print(json.dumps(response, indent=2))

        # Print summary
        if 'profiles' in response:
            profiles = response['profiles']
            sso_profiles = [p for p in profiles if p.get('is_sso')]
            cred_profiles = [p for p in profiles if not p.get('is_sso')]

            print(f"\nTotal profiles: {len(profiles)}", file=sys.stderr)
            print(f"SSO profiles: {len(sso_profiles)}", file=sys.stderr)
            print(f"Credential profiles: {len(cred_profiles)}", file=sys.stderr)
    else:
        print(f"No response or invalid response length: {len(response_length_bytes)} bytes", file=sys.stderr)

    # Read stderr
    stderr = proc.stderr.read().decode('utf-8')
    if stderr:
        print("\nStderr output:", file=sys.stderr)
        print(stderr, file=sys.stderr)

    proc.wait()
    print(f"\nProcess exited with code: {proc.returncode}", file=sys.stderr)
