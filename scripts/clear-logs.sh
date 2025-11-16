#!/bin/bash
# Clear AWS Profile Bridge debug logs

LOG_DIR="$HOME/.aws/logs"

echo "Clearing AWS Profile Bridge logs..."
echo ""

if [ -d "$LOG_DIR" ]; then
    # Count files
    COUNT=$(ls "$LOG_DIR"/aws_profile_bridge* 2>/dev/null | wc -l)

    if [ "$COUNT" -gt 0 ]; then
        # Show size before clearing
        SIZE=$(du -sh "$LOG_DIR" 2>/dev/null | cut -f1)
        echo "Current log directory size: $SIZE"
        echo "Files to remove: $COUNT"
        echo ""

        # Remove logs
        rm -f "$LOG_DIR"/aws_profile_bridge*.log*

        echo "✓ Logs cleared successfully"
    else
        echo "No log files found"
    fi
else
    echo "Log directory doesn't exist: $LOG_DIR"
fi
