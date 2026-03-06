# Nano Banana Prompt Import

Use this converter to pull prompt entries from:
- https://github.com/cuigh/awesome-nano-banana-prompts
- https://github.com/ZeroLu/awesome-nanobanana-pro

## One-time setup
Clone repositories under `tmp/`:

```powershell
git clone --depth 1 https://github.com/cuigh/awesome-nano-banana-prompts tmp/awesome-nano-banana-prompts
git clone --depth 1 https://github.com/ZeroLu/awesome-nanobanana-pro tmp/awesome-nanobanana-pro
```

## Convert to JSON

```powershell
npm run convert-nanobanana-prompts
```

Output file:
- `src/data/nanobanana_prompts.json`

## Custom output path

```powershell
python tools/convert_nanobanana_prompts.py --out src/data/your_file.json
```
