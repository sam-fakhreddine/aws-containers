#!/bin/bash
# Test the wrapper script directly to see if it works

echo "=========================================="
echo "Testing Wrapper Script Directly"
echo "=========================================="
echo ""

WRAPPER="$HOME/.local/bin/aws_profile_bridge"

if [ ! -f "$WRAPPER" ]; then
    echo "❌ Wrapper not found: $WRAPPER"
    exit 1
fi

if [ ! -x "$WRAPPER" ]; then
    echo "❌ Wrapper is not executable"
    exit 1
fi

echo "✓ Wrapper exists and is executable"
echo ""

echo "Testing wrapper with a simple message..."
echo "This will send getProfiles action and wait 5 seconds for response"
echo ""

# Create a test script that sends proper native messaging format
python3 - "$WRAPPER" << 'PYTHON_EOF'
import struct
import subprocess
import json
import sys
import time

wrapper = sys.argv[1] if len(sys.argv) > 1 else None
if not wrapper:
    print("Usage: pass wrapper path as argument")
    sys.exit(1)

print(f"Starting: {wrapper}")
print()

# Start the process
proc = subprocess.Popen(
    [wrapper],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE
)

print(f"Process started (PID: {proc.pid})")
print()

# Send a message
message = {"action": "getProfiles"}
message_json = json.dumps(message)
message_bytes = message_json.encode('utf-8')
length_bytes = struct.pack('I', len(message_bytes))

print(f"Sending: {message_json}")
proc.stdin.write(length_bytes)
proc.stdin.write(message_bytes)
proc.stdin.flush()
print("Message sent")
print()

# Try to read response (with timeout)
print("Waiting for response (5 seconds)...")
try:
    # Read 4-byte length
    length_bytes = proc.stdout.read(4)
    if len(length_bytes) == 4:
        message_length = struct.unpack('I', length_bytes)[0]
        print(f"Response length: {message_length} bytes")

        # Read message
        message_bytes = proc.stdout.read(message_length)
        message = json.loads(message_bytes.decode('utf-8'))

        print("✓ Response received:")
        print(json.dumps(message, indent=2))

        if message.get('action') == 'profileList':
            profiles = message.get('profiles', [])
            print(f"\n✓ Got {len(profiles)} profiles")
    else:
        print("❌ No response or incomplete response")

except Exception as e:
    print(f"❌ Error: {e}")

# Check stderr
try:
    proc.stdin.close()
    stderr_output = proc.stderr.read().decode('utf-8', errors='ignore')
    if stderr_output:
        print("\n⚠️  stderr output (THIS IS BAD - should be empty!):")
        print(stderr_output)
    else:
        print("\n✓ No stderr output (good!)")
except:
    pass

proc.kill()
print("\nTest complete")
PYTHON_EOF
