# Archive Summaries Rule

**CRITICAL: Always create summary and report files to .archive folder to keep the project clean.**

## Files to Archive

Move these types of files to `.archive/`:

- `*SUMMARY*.md`
- `*COMPLETE*.md` 
- `*REPORT*.md`
- `READY_FOR_*.md`
- Any temporary documentation files

## Commands

```bash
# Move summary files to archive
find . -name "*SUMMARY*.md" -not -path "./.archive/*" -exec mv {} .archive/ \;
find . -name "*COMPLETE*.md" -not -path "./.archive/*" -exec mv {} .archive/ \;
find . -name "*REPORT*.md" -not -path "./.archive/*" -exec mv {} .archive/ \;
find . -name "READY_FOR_*.md" -not -path "./.archive/*" -exec mv {} .archive/ \;
```

## Never Archive

- ❌ `README.md` files
- ❌ Documentation in `docs/` folder
- ❌ Configuration files
- ❌ Active project files

## Always Archive

- ✅ Temporary summary files
- ✅ Completion reports
- ✅ Status updates
- ✅ Migration summaries