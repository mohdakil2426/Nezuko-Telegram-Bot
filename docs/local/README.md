# 🔒 Local Documentation

> ⚠️ **WARNING: This folder is for LOCAL DEVELOPMENT ONLY**
>
> Contents in this folder should **NOT** be included in public GitHub releases.

---

## Purpose

This folder contains internal documentation that is:

1. **Development-specific** - Only relevant to the core development team
2. **Sensitive** - May contain internal processes or policies  
3. **Work-in-progress** - Not ready for public consumption

---

## Contents

| Folder | Description |
|--------|-------------|
| [`admin-panel/`](./admin-panel/) | Internal admin panel development documentation |
| [`official-rules-docs/`](./official-rules-docs/) | Internal rules and policies |
| [`openspec-my-guide/`](./openspec-my-guide/) | Personal OpenSpec workflow guide |

---

## Excluding from Releases

### Option 1: .gitattributes (Recommended)

Add to `.gitattributes`:
```
docs/local/** export-ignore
```

This excludes the folder from `git archive` operations.

### Option 2: Release Script

When creating releases, exclude this folder:
```bash
# In release script
tar --exclude='docs/local' -czf release.tar.gz .
```

### Option 3: Separate Branch

Keep local docs in a `docs/local-only` branch that's never merged to `main`.

---

## Adding New Local Docs

1. Create a new folder under `docs/local/`
2. Add a `README.md` explaining the purpose
3. Mark any sensitive files appropriately

---

*This folder is gitignored in release builds.*
