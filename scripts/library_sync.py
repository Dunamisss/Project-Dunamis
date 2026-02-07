import argparse
import json
import re
import sys
import hashlib
from pathlib import Path

try:
    from PIL import Image
except Exception:  # pragma: no cover
    Image = None


ROOT = Path(__file__).resolve().parents[1]
PROMPT_SRC_DIR = ROOT / "prompts"
IMAGE_SRC_DIR = ROOT / "Images"
PROMPT_OUT = ROOT / "src" / "data" / "promptLibrary.ts"
IMAGE_OUT = ROOT / "src" / "data" / "imageLibrary.ts"
IMAGE_FULL_DIR = ROOT / "public" / "images" / "library" / "full"
IMAGE_THUMB_DIR = ROOT / "public" / "images" / "library" / "thumbs"

IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".gif"}

STOPWORDS = {
    "a","an","the","and","or","of","to","in","on","for","with","from","by","at",
    "is","are","was","were","be","been","being","this","that","these","those",
    "image","photo","photograph","digital","art","artwork","render","rendered","high","quality",
    "ultra","close","up","hd","4k","8k","v","version","scene","featuring","featuring",
}


def slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = text.strip("-")
    return text or "item"


def titleize(name: str) -> str:
    name = re.sub(r"\.[^.]+$", "", name)
    name = name.replace("_", " ")
    name = re.sub(r"\s+", " ", name).strip()
    return name


def build_tags(title: str, limit: int = 5) -> list[str]:
    tokens = [t.lower() for t in re.split(r"[^a-zA-Z0-9]+", title) if t]
    tags = []
    for token in tokens:
        if token.isdigit():
            continue
        if len(token) < 4:
            continue
        if token in STOPWORDS:
            continue
        if token not in tags:
            tags.append(token)
        if len(tags) >= limit:
            break
    return tags


def short_slug(text: str) -> str:
    base = slugify(text)
    words = [w for w in base.split("-") if w]
    short_base = "-".join(words[:6]) if words else "item"
    digest = hashlib.sha1(base.encode("utf-8")).hexdigest()[:8]
    return f"{short_base}-{digest}"


def read_prompt_files(src_dir: Path) -> list[dict]:
    prompts = []
    for path in sorted(src_dir.glob("*.txt")):
        raw = path.read_text(encoding="utf-8").strip()
        if not raw:
            continue
        lines = raw.splitlines()
        first = lines[0]
        if "|" in first:
            title, desc = [part.strip() for part in first.split("|", 1)]
            content = "\n".join(lines[1:]).strip()
        else:
            title = first.strip()
            desc = "Custom prompt."
            content = "\n".join(lines[1:]).strip()
        if not content:
            content = raw
        prompts.append({
            "title": title or path.stem,
            "description": desc or "Custom prompt.",
            "content": content,
            "source": path.name,
        })
    return prompts


def load_existing_prompts(out_path: Path) -> tuple[str, set[str]]:
    if not out_path.exists():
        return "", set()
    text = out_path.read_text(encoding="utf-8")
    titles = set(re.findall(r'title:\s*"([^"]+)"', text))
    return text, {t.strip().lower() for t in titles}


def _to_ts_object(entry: dict) -> str:
    content = entry["content"].replace("`", "\\`").replace("${", "\\${")
    tags = ", ".join([f"\"{t}\"" for t in entry["tags"]])
    return (
        "  {\n"
        f"    id: \"{entry['id']}\",\n"
        f"    title: \"{entry['title']}\",\n"
        f"    category: \"{entry['category']}\",\n"
        f"    description: \"{entry['description']}\",\n"
        f"    tags: [{tags}],\n"
        f"    content: `{content}`,\n"
        "  },\n"
    )


def sync_prompts(args: argparse.Namespace) -> None:
    src_dir = Path(args.prompts_dir)
    if not src_dir.exists():
        print(f"Prompt folder not found: {src_dir}")
        sys.exit(1)

    text, existing_titles = load_existing_prompts(PROMPT_OUT)
    if not text:
        print("promptLibrary.ts not found or empty. Aborting to avoid overwrite.")
        sys.exit(1)

    array_start = text.find("export const PROMPT_LIBRARY")
    if array_start == -1:
        print("PROMPT_LIBRARY not found. Aborting to avoid overwrite.")
        sys.exit(1)
    open_bracket = text.find("[", array_start)
    close_bracket = text.rfind("];")
    if open_bracket == -1 or close_bracket == -1:
        print("Could not locate prompt array boundaries. Aborting.")
        sys.exit(1)

    incoming = read_prompt_files(src_dir)
    new_blocks = []
    added = 0
    for item in incoming:
        key = item["title"].strip().lower()
        slug = slugify(item["title"])
        new_entry = {
            "id": slug,
            "title": item["title"],
            "category": args.default_category,
            "description": item["description"],
            "tags": build_tags(item["title"]),
            "content": item["content"],
        }

        if key in existing_titles:
            if args.on_duplicate == "skip":
                continue
            if args.on_duplicate == "overwrite":
                print(f"Duplicate '{item['title']}' found. Overwrite not supported in TS mode. Skipping.")
                continue
            print(f"Duplicate title found: {item['title']}")
            choice = input("Choose: [s]kip or [r]ename: ").strip().lower()
            if choice.startswith("s"):
                continue
            if choice.startswith("r"):
                new_title = input("New title: ").strip()
                if new_title:
                    new_entry["title"] = new_title
                    new_entry["id"] = slugify(new_title)
                    new_entry["tags"] = build_tags(new_title)
                else:
                    continue
            else:
                continue

        new_blocks.append(_to_ts_object(new_entry))
        existing_titles.add(new_entry["title"].strip().lower())
        added += 1

    if not new_blocks:
        print("No new prompts to add.")
        return

    insert_pos = close_bracket
    updated_text = text[:insert_pos] + "".join(new_blocks) + text[insert_pos:]
    PROMPT_OUT.write_text(updated_text, encoding="utf-8")
    print(f"Added {added} prompt(s).")


def load_existing_images(out_path: Path) -> list[dict]:
    if not out_path.exists():
        return []
    text = out_path.read_text(encoding="utf-8")
    try:
        return _extract_json_array(text, "export const IMAGE_LIBRARY")
    except Exception:
        return []


def write_images(items: list[dict], out_path: Path) -> None:
    header = (
        "export interface ImageLibraryItem {\n"
        "  id: string;\n"
        "  title: string;\n"
        "  description: string;\n"
        "  tags: string[];\n"
        "  full: string;\n"
        "  thumb: string;\n"
        "}\n\n"
        "export const IMAGE_LIBRARY: ImageLibraryItem[] = "
    )
    out_path.write_text(header + json.dumps(items, ensure_ascii=True, indent=2) + ";\n", encoding="utf-8")


def ensure_pillow():
    if Image is None:
        print("Pillow is required. Install with: pip install pillow")
        sys.exit(1)


def convert_images(src_dir: Path) -> list[dict]:
    ensure_pillow()
    IMAGE_FULL_DIR.mkdir(parents=True, exist_ok=True)
    IMAGE_THUMB_DIR.mkdir(parents=True, exist_ok=True)

    items = []
    for path in sorted(src_dir.iterdir()):
        if not path.is_file():
            continue
        if path.suffix.lower() not in IMAGE_EXTS:
            continue

        title = titleize(path.name)
        slug = short_slug(title)
        full_path = IMAGE_FULL_DIR / f"{slug}.webp"
        thumb_path = IMAGE_THUMB_DIR / f"{slug}.webp"

        if not full_path.exists() or not thumb_path.exists():
            img = Image.open(path)
            img.load()

            full_img = img.copy()
            full_img.thumbnail((2000, 2000), Image.LANCZOS)
            if full_img.mode in ("P", "RGBA", "LA"):
                full_img = full_img.convert("RGBA")
            else:
                full_img = full_img.convert("RGB")
            full_img.save(full_path, "WEBP", quality=82, method=6)

            thumb_img = img.copy()
            thumb_img.thumbnail((480, 4800), Image.LANCZOS)
            if thumb_img.mode in ("P", "RGBA", "LA"):
                thumb_img = thumb_img.convert("RGBA")
            else:
                thumb_img = thumb_img.convert("RGB")
            thumb_img.save(thumb_path, "WEBP", quality=70, method=6)

        items.append({
            "id": slug,
            "title": title,
            "description": f"Original artwork: {title[:80]}.",
            "tags": build_tags(title),
            "full": f"/images/library/full/{slug}.webp",
            "thumb": f"/images/library/thumbs/{slug}.webp",
        })

    return items


def sync_images(args: argparse.Namespace) -> None:
    src_dir = Path(args.images_dir)
    if not src_dir.exists():
        print(f"Image folder not found: {src_dir}")
        sys.exit(1)
    items = convert_images(src_dir)
    write_images(items, IMAGE_OUT)
    print(f"Processed {len(items)} images")


def main() -> None:
    parser = argparse.ArgumentParser(description="Sync prompt and image libraries.")
    sub = parser.add_subparsers(dest="command", required=False)

    prompt_parser = sub.add_parser("prompts", help="Sync prompt txt files into prompt library.")
    prompt_parser.add_argument("--prompts-dir", default=str(PROMPT_SRC_DIR))
    prompt_parser.add_argument("--default-category", default="Other")
    prompt_parser.add_argument("--on-duplicate", choices=["ask", "skip", "overwrite"], default="ask")
    prompt_parser.set_defaults(func=sync_prompts)

    image_parser = sub.add_parser("images", help="Convert images to webp and sync image library.")
    image_parser.add_argument("--images-dir", default=str(IMAGE_SRC_DIR))
    image_parser.set_defaults(func=sync_images)

    args = parser.parse_args()

    if not args.command:
        print("Dunamis Library Sync")
        print("1) Sync prompts")
        print("2) Sync images")
        print("3) Sync both")
        print("4) Exit")
        choice = input("Choose an option: ").strip()
        if choice == "4":
            return
        if choice not in {"1", "2", "3"}:
            print("Invalid option.")
            return

        if choice in {"1", "3"}:
            category = input("Default category (blank for Other): ").strip() or "Other"
            on_dup = input("On duplicate [ask/skip/overwrite] (default ask): ").strip().lower() or "ask"
            if on_dup not in {"ask", "skip", "overwrite"}:
                on_dup = "ask"
            sync_prompts(argparse.Namespace(
                prompts_dir=str(PROMPT_SRC_DIR),
                default_category=category,
                on_duplicate=on_dup,
            ))
        if choice in {"2", "3"}:
            sync_images(argparse.Namespace(images_dir=str(IMAGE_SRC_DIR)))
        return

    args.func(args)


if __name__ == "__main__":
    main()
