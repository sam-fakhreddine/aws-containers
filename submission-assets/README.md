# Firefox Extension Submission Assets

This directory contains all materials needed for Firefox Add-ons (AMO) submission.

## Contents

- `SUBMISSION_DESCRIPTION.md` - Complete listing description and metadata
- `SCREENSHOT_GUIDE.md` - Guide for creating required screenshots
- `screenshots/` - Directory for screenshot files (create these manually)

## Quick Start

1. **Create Screenshots**
   - Follow `SCREENSHOT_GUIDE.md`
   - Save to `screenshots/` directory
   - Required: 3-5 screenshots at 1280x800 or 640x400

2. **Build Extension**
   ```bash
   cd ..
   yarn build
   ```
   Package will be at: `web-ext-artifacts/aws_profile_containers-0.1.0.zip`

3. **Run Preparation Script**
   ```bash
   ./scripts/prepare-submission.sh
   ```

4. **Submit to Mozilla**
   - Go to https://addons.mozilla.org/developers/
   - Click "Submit a New Add-on"
   - Upload the .zip file
   - Copy description from `SUBMISSION_DESCRIPTION.md`
   - Upload screenshots from `screenshots/`

## Submission Checklist

See `../FIREFOX_SUBMISSION_CHECKLIST.md` for complete checklist.

### Critical Items
- [ ] Screenshots created (3-5 required)
- [ ] Extension built and tested
- [ ] Privacy policy reviewed
- [ ] Support email configured
- [ ] All tests passing

### Before Submission
- [ ] Test in clean Firefox profile
- [ ] Verify no console errors
- [ ] Check all permissions work
- [ ] Review manifest.json
- [ ] Verify icons display correctly

## Support Information

- **Homepage**: https://github.com/sam-fakhreddine/aws-console-containers
- **Issues**: https://github.com/sam-fakhreddine/aws-console-containers/issues
- **Email**: aws-containers@samfakhreddine.dev
- **Privacy**: https://github.com/sam-fakhreddine/aws-console-containers/blob/main/docs/security/privacy.md

## Notes

### API Server Requirement
This extension requires a companion API server. Make sure to explain this clearly in submission notes (see `SUBMISSION_DESCRIPTION.md`).

### Review Timeline
- Typical review: 1-7 days
- Complex extensions: Up to 2 weeks
- Be responsive to reviewer questions

### After Approval
- Update README with AMO link
- Announce release
- Monitor user feedback
