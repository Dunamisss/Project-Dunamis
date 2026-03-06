#!/usr/bin/env python3
"""Convert Nano Banana README prompt collections into normalized JSON.

Usage:
  python tools/convert_nanobanana_prompts.py
  python tools/convert_nanobanana_prompts.py --out src/data/nanobanana_prompts.json
"""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

HEADING_RE = re.compile(r"^###\s+(.+?)\s*$")
FENCE_RE = re.compile(r"```([a-zA-Z0-9_-]*)\n(.*?)```", re.DOTALL)
LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
SOURCE_RE = re.compile(r"\*Source:\s*(.+?)\*\s*$", re.IGNORECASE)
INPUT_RE = re.compile(r"\*\*input:\*\*\s*(.+)$", re.IGNORECASE)
PROMPT_MARKER_RE = re.compile(r"\*\*prompt:\*\*", re.IGNORECASE)


@dataclass
class RepoSource:
    key: str
    repo_url: str
    readme_path: Path


@dataclass
class Section:
    heading: str
    body: str


def slugify(text: str) -> str:
    cleaned = re.sub(r"\[[^\]]+\]\([^)]+\)", lambda m: m.group(1), text)
    cleaned = cleaned.lower()
    cleaned = re.sub(r"[^a-z0-9]+", "-", cleaned).strip("-")
    return cleaned or "untitled"


def split_sections(readme_text: str) -> list[Section]:
    sections: list[Section] = []
    current_heading: str | None = None
    current_lines: list[str] = []

    for line in readme_text.splitlines():
        match = HEADING_RE.match(line)
        if match:
            if current_heading is not None:
                sections.append(Section(heading=current_heading, body="\n".join(current_lines)))
            current_heading = match.group(1).strip()
            current_lines = []
            continue

        if current_heading is not None:
            current_lines.append(line)

    if current_heading is not None:
        sections.append(Section(heading=current_heading, body="\n".join(current_lines)))

    return sections


def extract_heading_links(heading: str) -> tuple[str, str | None]:
    title = heading
    first_url: str | None = None

    links = list(LINK_RE.finditer(heading))
    if links:
        first_url = links[0].group(2)
        title = LINK_RE.sub(lambda m: m.group(1), heading)

    # Normalize patterns such as "Case 12: Title (by @user)"
    title = re.sub(r"\s*\(by\s+[^)]*\)\s*$", "", title, flags=re.IGNORECASE).strip()
    return title, first_url


def choose_prompt_block(body: str) -> tuple[str, str]:
    marker = PROMPT_MARKER_RE.search(body)
    blocks = list(FENCE_RE.finditer(body))
    if not blocks:
        return "", ""

    if marker is None:
        block = blocks[0]
        return (block.group(1) or "text").lower(), block.group(2).strip()

    for block in blocks:
        if block.start() > marker.start():
            return (block.group(1) or "text").lower(), block.group(2).strip()

    block = blocks[0]
    return (block.group(1) or "text").lower(), block.group(2).strip()


def extract_source_line(body: str) -> str | None:
    for line in body.splitlines():
        match = SOURCE_RE.search(line.strip())
        if match:
            return match.group(1).strip()
    return None


def extract_source_urls(text: str | None) -> list[str]:
    if not text:
        return []
    return [m.group(2) for m in LINK_RE.finditer(text)]


def extract_input_requirement(body: str) -> str | None:
    for line in body.splitlines():
        match = INPUT_RE.search(line.strip())
        if match:
            return match.group(1).strip()
    return None


def parse_sections(source: RepoSource) -> list[dict]:
    text = source.readme_path.read_text(encoding="utf-8")
    sections = split_sections(text)
    results: list[dict] = []

    running_index = 1
    for section in sections:
        if section.heading.lower().startswith("sponsor"):
            continue

        lang, prompt_text = choose_prompt_block(section.body)
        if not prompt_text:
            continue

        title, primary_url = extract_heading_links(section.heading)
        source_line = extract_source_line(section.body)
        source_urls = extract_source_urls(source_line)
        if primary_url and primary_url not in source_urls:
            source_urls.insert(0, primary_url)

        item = {
            "id": f"{source.key}-{running_index:04d}-{slugify(title)[:80]}",
            "repo": source.key,
            "repo_url": source.repo_url,
            "title": title,
            "heading": section.heading,
            "prompt": prompt_text,
            "prompt_format": lang or "text",
            "source_urls": source_urls,
            "source_label": source_line,
            "input_requirement": extract_input_requirement(section.body),
        }
        results.append(item)
        running_index += 1

    return results


def dedupe(items: Iterable[dict]) -> tuple[list[dict], int]:
    seen: set[str] = set()
    deduped: list[dict] = []
    duplicates = 0

    for item in items:
        fingerprint = "|".join(
            [
                item["title"].strip().lower(),
                re.sub(r"\s+", " ", item["prompt"].strip().lower()),
            ]
        )
        if fingerprint in seen:
            duplicates += 1
            continue
        seen.add(fingerprint)
        deduped.append(item)

    return deduped, duplicates


def main() -> None:
    parser = argparse.ArgumentParser(description="Convert Nano Banana prompt repos to normalized JSON")
    parser.add_argument(
        "--out",
        default="src/data/nanobanana_prompts.json",
        help="Output JSON path (default: src/data/nanobanana_prompts.json)",
    )
    parser.add_argument(
        "--repo-root",
        default="tmp",
        help="Directory containing cloned repositories (default: tmp)",
    )
    args = parser.parse_args()

    repo_root = Path(args.repo_root)
    sources = [
        RepoSource(
            key="cuigh-awesome-nano-banana-prompts",
            repo_url="https://github.com/cuigh/awesome-nano-banana-prompts",
            readme_path=repo_root / "awesome-nano-banana-prompts" / "README.md",
        ),
        RepoSource(
            key="zerolu-awesome-nanobanana-pro",
            repo_url="https://github.com/ZeroLu/awesome-nanobanana-pro",
            readme_path=repo_root / "awesome-nanobanana-pro" / "README.md",
        ),
    ]

    all_items: list[dict] = []
    for source in sources:
        if not source.readme_path.exists():
            raise FileNotFoundError(f"Missing README: {source.readme_path}")
        all_items.extend(parse_sections(source))

    deduped, duplicate_count = dedupe(all_items)

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "generated_at": __import__("datetime").datetime.utcnow().isoformat() + "Z",
        "sources": [
            {"key": s.key, "repo_url": s.repo_url, "readme": str(s.readme_path).replace("\\", "/")} for s in sources
        ],
        "counts": {
            "raw": len(all_items),
            "unique": len(deduped),
            "duplicates_removed": duplicate_count,
        },
        "prompts": deduped,
    }

    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(deduped)} prompts to {out_path}")
    print(f"Raw={len(all_items)} duplicates_removed={duplicate_count}")


if __name__ == "__main__":
    main()
