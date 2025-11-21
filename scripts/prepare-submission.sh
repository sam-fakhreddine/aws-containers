#!/bin/bash
set -e

# Firefox Extension Submission Preparation Script

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SCREENSHOTS_DIR="$PROJECT_ROOT/submission-assets/screenshots"
PACKAGE_DIR="$PROJECT_ROOT/web-ext-artifacts"

echo "🚀 Preparing Firefox Extension Submission"
echo "=========================================="

# Create submission assets directory
mkdir -p "$SCREENSHOTS_DIR"

# Check if extension is built
if [ ! -f "$PACKAGE_DIR/aws_profile_containers-0.1.0.zip" ]; then
    echo "❌ Extension package not found. Building..."
    cd "$PROJECT_ROOT"
    yarn build
fi

echo "✅ Extension package ready: $PACKAGE_DIR/aws_profile_containers-0.1.0.zip"

# Verify package contents
echo ""
echo "📦 Package Contents:"
unzip -l "$PACKAGE_DIR/aws_profile_containers-0.1.0.zip" | head -20

# Check manifest
echo ""
echo "📋 Manifest Info:"
unzip -p "$PACKAGE_DIR/aws_profile_containers-0.1.0.zip" manifest.json | grep -E '"name"|"version"|"description"'

# Verify icons exist
echo ""
echo "🎨 Icons:"
for size in 16 32 48 96 128; do
    if [ -f "$PROJECT_ROOT/dist/icons/icon-${size}.png" ]; then
        echo "  ✅ icon-${size}.png"
    else
        echo "  ❌ icon-${size}.png MISSING"
    fi
done

# Check for screenshots
echo ""
echo "📸 Screenshots:"
if [ -d "$SCREENSHOTS_DIR" ] && [ "$(ls -A $SCREENSHOTS_DIR)" ]; then
    ls -lh "$SCREENSHOTS_DIR"
else
    echo "  ⚠️  No screenshots found in $SCREENSHOTS_DIR"
    echo "  📝 Create screenshots manually:"
    echo "     1. Load extension in Firefox"
    echo "     2. Take screenshots of:"
    echo "        - Popup with profile list"
    echo "        - Settings page"
    echo "        - Multiple containers with AWS Console"
    echo "     3. Save as PNG (1280x800 or 640x400)"
    echo "     4. Place in: $SCREENSHOTS_DIR"
fi

# Check documentation
echo ""
echo "📚 Documentation:"
docs=(
    "README.md"
    "LICENSE"
    "docs/security/privacy.md"
    "docs/getting-started/install-root.md"
)

for doc in "${docs[@]}"; do
    if [ -f "$PROJECT_ROOT/$doc" ]; then
        echo "  ✅ $doc"
    else
        echo "  ❌ $doc MISSING"
    fi
done

# Run tests
echo ""
echo "🧪 Running Tests:"
cd "$PROJECT_ROOT"
if yarn test --passWithNoTests; then
    echo "  ✅ Tests passed"
else
    echo "  ❌ Tests failed"
    exit 1
fi

# Check for common issues
echo ""
echo "🔍 Pre-Submission Checks:"

# Check for console.log in production code
if grep -r "console\.log" "$PROJECT_ROOT/dist/js" 2>/dev/null | grep -v ".map"; then
    echo "  ⚠️  Found console.log in production build"
else
    echo "  ✅ No console.log in production"
fi

# Check for TODO/FIXME
if grep -r "TODO\|FIXME" "$PROJECT_ROOT/src" 2>/dev/null | head -5; then
    echo "  ⚠️  Found TODO/FIXME in source"
else
    echo "  ✅ No TODO/FIXME found"
fi

# Summary
echo ""
echo "=========================================="
echo "📋 Submission Checklist:"
echo ""
echo "Before submitting to Mozilla:"
echo "  1. ⚠️  Create screenshots (see above)"
echo "  2. ⚠️  Add support email to package.json"
echo "  3. ⚠️  Test in clean Firefox profile"
echo "  4. ✅ Review FIREFOX_SUBMISSION_CHECKLIST.md"
echo "  5. ✅ Verify privacy policy is up to date"
echo ""
echo "Package ready at:"
echo "  $PACKAGE_DIR/aws_profile_containers-0.1.0.zip"
echo ""
echo "Next steps:"
echo "  1. Create screenshots"
echo "  2. Go to https://addons.mozilla.org/developers/"
echo "  3. Submit extension"
echo ""
