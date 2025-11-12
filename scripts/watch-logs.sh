#!/bin/bash
# Watch AWS Profile Bridge debug logs in real-time

LOG_FILE="$HOME/.aws/logs/aws_profile_bridge.log"
ERROR_LOG="$HOME/.aws/logs/aws_profile_bridge_errors.log"

echo "=========================================="
echo "AWS Profile Bridge - Live Debug Logs"
echo "=========================================="
echo ""
echo "Debug log: $LOG_FILE"
echo "Error log: $ERROR_LOG"
echo ""
echo "Press Ctrl+C to stop watching"
echo ""
echo "=========================================="
echo ""

# Check if log file exists
if [ ! -f "$LOG_FILE" ]; then
    echo "Waiting for log file to be created..."
    echo "(Trigger the extension to start logging)"
    echo ""
fi

# Tail both log files
tail -f "$LOG_FILE" "$ERROR_LOG" 2>/dev/null
