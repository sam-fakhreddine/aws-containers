# Screenshot Creation Guide

## Requirements

- **Dimensions**: 1280x800 or 640x400 pixels
- **Format**: PNG
- **Count**: 3-5 screenshots minimum
- **Quality**: High resolution, clear text

## Screenshots Needed

### 1. Extension Popup - Profile List
**Filename**: `01-popup-profile-list.png`

**What to show**:
- Extension popup open
- List of AWS profiles visible
- Search bar at top
- Favorites section (if any)
- Recent profiles section
- Region selector dropdown

**How to capture**:
1. Load extension in Firefox
2. Click extension icon to open popup
3. Ensure you have multiple profiles in ~/.aws/credentials
4. Take screenshot of entire popup
5. Crop to 1280x800 or 640x400

**Tips**:
- Use demo/test profile names (not real account names)
- Show at least 5-7 profiles
- Include mix of regular and SSO profiles if possible

---

### 2. Settings Page
**Filename**: `02-settings-page.png`

**What to show**:
- Settings page open in full tab
- API server configuration section
- Token management section
- Region preferences
- Container cleanup options

**How to capture**:
1. Click settings icon in popup
2. Settings page opens in new tab
3. Take screenshot of settings page
4. Crop to 1280x800

**Tips**:
- Show all settings sections
- Ensure text is readable
- Show connected API server status

---

### 3. Multiple Containers Active
**Filename**: `03-multiple-containers.png`

**What to show**:
- Firefox window with multiple tabs
- Each tab in different container (visible in tab bar)
- AWS Console visible in tabs
- Container colors/indicators visible

**How to capture**:
1. Open 3-4 different AWS profiles
2. Each opens in separate container
3. Arrange tabs to show container indicators
4. Take screenshot of entire Firefox window
5. Crop to show tab bar and content

**Tips**:
- Use different container colors
- Show AWS Console in each tab
- Make container indicators clearly visible
- Blur/redact any account numbers or sensitive info

---

### 4. Profile Selection Flow
**Filename**: `04-profile-selection.png`

**What to show**:
- Popup with profile being selected
- Hover state or click action
- Shows the interaction

**How to capture**:
1. Open popup
2. Hover over a profile
3. Capture hover state
4. Or capture right after clicking

**Tips**:
- Show interactive state
- Highlight the selected profile
- Show favorites star or recent indicator

---

### 5. Favorites and Recent (Optional)
**Filename**: `05-favorites-recent.png`

**What to show**:
- Popup with favorites section expanded
- Recent profiles section visible
- Star icons for favorites

**How to capture**:
1. Add some profiles to favorites
2. Open a few profiles to populate recent
3. Open popup
4. Capture with both sections visible

---

## Screenshot Checklist

Before taking screenshots:
- [ ] Clean Firefox profile (no other extensions visible)
- [ ] Use test/demo AWS profile names
- [ ] Ensure API server is running
- [ ] Have at least 5-7 test profiles configured
- [ ] Clear any sensitive information
- [ ] Use consistent theme (light or dark)

During screenshot capture:
- [ ] High resolution (1280x800 or 640x400)
- [ ] Clear, readable text
- [ ] No personal/sensitive information
- [ ] Show key features
- [ ] Professional appearance

After capture:
- [ ] Crop to exact dimensions
- [ ] Optimize file size (PNG compression)
- [ ] Verify no sensitive data visible
- [ ] Check image quality
- [ ] Name files consistently

## Tools for Screenshots

### macOS
- **Cmd+Shift+4**: Select area to capture
- **Cmd+Shift+4, Space**: Capture window
- Preview app for cropping/editing

### Linux
- **gnome-screenshot**: Built-in tool
- **Flameshot**: Advanced screenshot tool
- **GIMP**: For editing/cropping

### Firefox Developer Tools
- **Responsive Design Mode** (Cmd+Opt+M): Set exact dimensions
- **Screenshot tool**: Built into Firefox DevTools

## Image Optimization

After capturing, optimize images:

```bash
# Using ImageMagick
convert input.png -resize 1280x800 -quality 95 output.png

# Using pngquant (reduce file size)
pngquant --quality=80-95 input.png -o output.png
```

## Redacting Sensitive Information

If screenshots contain sensitive data:

1. **Account Numbers**: Blur or replace with "123456789012"
2. **Profile Names**: Use generic names like "dev-account", "prod-account"
3. **Regions**: OK to show (not sensitive)
4. **URLs**: Blur account-specific parts

Use tools:
- macOS Preview: Markup tools
- GIMP: Blur/pixelate filters
- Online tools: photopea.com

## Example Profile Names for Screenshots

Use these generic names:
- development
- staging
- production
- testing
- demo-account
- client-dev
- client-prod
- personal-aws
- work-account

## Final Check

Before submitting screenshots:
- [ ] All images are 1280x800 or 640x400
- [ ] All images are PNG format
- [ ] File sizes are reasonable (<500KB each)
- [ ] No sensitive information visible
- [ ] Images show key features clearly
- [ ] Text is readable
- [ ] Professional appearance
- [ ] Consistent styling across all screenshots
