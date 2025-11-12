#!/bin/bash
# Clean AWS Profile Bridge debug logs
# Usage: ./scripts/clean-logs.sh [--all]

set -e

LOG_DIR="$HOME/.aws/logs"
LOG_FILE="$LOG_DIR/aws_profile_bridge.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "AWS Profile Bridge - Log Cleanup"
echo "================================"
echo ""

# Check if log directory exists
if [ ! -d "$LOG_DIR" ]; then
    echo -e "${YELLOW}No log directory found at: $LOG_DIR${NC}"
    exit 0
fi

# Count log files
CURRENT_LOG_EXISTS=false
ROTATED_COUNT=0

if [ -f "$LOG_FILE" ]; then
    CURRENT_LOG_EXISTS=true
fi

ROTATED_COUNT=$(ls -1 "$LOG_FILE".* 2>/dev/null | wc -l)

# Show current state
echo "Log directory: $LOG_DIR"
echo ""
echo "Current state:"
if [ "$CURRENT_LOG_EXISTS" = true ]; then
    CURRENT_SIZE=$(du -h "$LOG_FILE" | cut -f1)
    echo "  • Current log: $CURRENT_SIZE"
else
    echo "  • Current log: (none)"
fi
echo "  • Rotated logs: $ROTATED_COUNT files"

if [ "$ROTATED_COUNT" -gt 0 ]; then
    TOTAL_SIZE=$(du -sh "$LOG_DIR" 2>/dev/null | cut -f1)
    echo "  • Total size: $TOTAL_SIZE"
fi

echo ""

# Parse command line arguments
CLEAN_ALL=false
if [ "$1" = "--all" ]; then
    CLEAN_ALL=true
fi

# Perform cleanup
if [ "$CLEAN_ALL" = true ]; then
    # Remove all logs including current
    echo "Removing ALL log files (including current)..."
    rm -f "$LOG_FILE"* 2>/dev/null || true
    echo -e "${GREEN}✓${NC} All log files removed"
else
    # Remove only rotated logs (keep current)
    if [ "$ROTATED_COUNT" -gt 0 ]; then
        echo "Removing rotated log files (keeping current)..."
        rm -f "$LOG_FILE".* 2>/dev/null || true
        echo -e "${GREEN}✓${NC} Removed $ROTATED_COUNT rotated log files"
        echo -e "${GREEN}✓${NC} Current log file preserved"
    else
        echo -e "${YELLOW}No rotated log files to clean${NC}"
    fi
fi

echo ""
echo "Usage tips:"
echo "  • Remove rotated logs only: ./scripts/clean-logs.sh"
echo "  • Remove all logs: ./scripts/clean-logs.sh --all"
echo "  • View current logs: tail -f $LOG_FILE"
echo "  • Check log size: du -sh $LOG_DIR"
echo ""
