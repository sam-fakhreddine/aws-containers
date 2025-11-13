#!/bin/bash
# Monitor if the bridge is being called at all

echo "Monitoring for aws_profile_bridge processes..."
echo "Press Ctrl+C to stop"
echo ""

while true; do
    PROCESSES=$(ps aux | grep aws_profile_bridge | grep -v grep | grep -v monitor)
    if [ ! -z "$PROCESSES" ]; then
        echo "[$(date '+%H:%M:%S')] Bridge process detected:"
        echo "$PROCESSES"
        echo ""
    fi
    sleep 0.5
done
