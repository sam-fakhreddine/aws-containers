# Quick Start: Firefox Extension Submission

## Ready to Submit ✅

Your extension is ready for Firefox Add-ons submission with these items complete:

✅ Extension package built: `web-ext-artifacts/aws_profile_containers-0.1.0.zip`
✅ Privacy policy with contact email
✅ Support information configured
✅ Documentation complete
✅ Icons optimized
✅ Manifest configured

## What You Need to Do

### 1. Create Screenshots (REQUIRED)

Follow the guide in `SCREENSHOT_GUIDE.md` to create 3-5 screenshots:

- Screenshot 1: Extension popup with profile list
- Screenshot 2: Settings page
- Screenshot 3: Multiple containers active
- Screenshot 4: Profile selection flow

Save screenshots to: `submission-assets/screenshots/`

**Estimated time**: 15-30 minutes

### 2. Test in Clean Firefox Profile (RECOMMENDED)

```bash
# Create clean Firefox profile for testing
firefox -P

# Load extension in clean profile
# Go to about:debugging#/runtime/this-firefox
# Click "Load Temporary Add-on"
# Select: dist/manifest.json
```

Verify:
- Extension loads without errors
- Profiles display correctly
- Settings page works
- Containers open properly

**Estimated time**: 10-15 minutes

### 3. Submit to Mozilla

1. **Go to**: https://addons.mozilla.org/developers/
2. **Sign in** or create account
3. **Click**: "Submit a New Add-on"
4. **Upload**: `web-ext-artifacts/aws_profile_containers-0.1.0.zip`
5. **Select**: "On this site" (for initial submission)
6. **Fill out listing**:
   - Copy description from `SUBMISSION_DESCRIPTION.md`
   - Upload screenshots from `screenshots/`
   - Add support URLs (already in SUBMISSION_DESCRIPTION.md)
7. **Add reviewer notes** (from SUBMISSION_DESCRIPTION.md)
8. **Submit** for review

**Estimated time**: 20-30 minutes

## Submission Information

All ready to copy/paste from `SUBMISSION_DESCRIPTION.md`:

- Extension name
- Summary (250 chars)
- Full description
- Support URLs
- Privacy policy link
- Reviewer notes

## Timeline

- **Submission**: Today
- **Review**: 1-7 days (typically)
- **Approval**: Automatic publication after approval
- **Total**: ~1 week

## After Submission

1. **Monitor review status** at https://addons.mozilla.org/developers/
2. **Respond promptly** to any reviewer questions
3. **Update README** with AMO link once approved
4. **Announce release** on GitHub

## Need Help?

- Review checklist: `../FIREFOX_SUBMISSION_CHECKLIST.md`
- Screenshot guide: `SCREENSHOT_GUIDE.md`
- Full description: `SUBMISSION_DESCRIPTION.md`
- Run checks: `../scripts/prepare-submission.sh`

## Contact

- **Issues**: https://github.com/sam-fakhreddine/aws-console-containers/issues
- **Email**: aws-containers@samfakhreddine.dev
