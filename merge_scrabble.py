#!/usr/bin/env python3
import json
from pathlib import Path

BASE = Path(__file__).resolve().parent
SCRABBLE = BASE / 'qless-dict.txt'
SHORT = BASE / 'dictionary-short.json'
LONG = BASE / 'dictionary-long.json'

def load_lines(p: Path):
    if not p.exists():
        return []
    return [l.strip() for l in p.read_text(encoding='utf-8').splitlines() if l.strip()]

def load_json(p: Path):
    if not p.exists():
        return []
    try:
        return json.loads(p.read_text(encoding='utf-8'))
    except Exception:
        return []

def write_json(p: Path, data):
    p.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding='utf-8')

def main():
    scrabble = load_lines(SCRABBLE)
    short_old = load_json(SHORT)
    long_old = load_json(LONG)
    extra_old = load_json(BASE / 'dictionary-extra.json')

    # Normalize to lowercase and dedupe across all sources
    all_words = set(w.lower() for w in scrabble)
    all_words.update(w.lower() for w in short_old)
    all_words.update(w.lower() for w in long_old)
    all_words.update(w.lower() for w in extra_old)

    sorted_words = sorted(all_words)

    # Split by length like generate_dictionary.py
    short_words = [w for w in sorted_words if len(w) <= 4]
    long_words = [w for w in sorted_words if 5 <= len(w) <= 8]
    extra_words = [w for w in sorted_words if len(w) > 8]

    # Write files
    write_json(BASE / 'dictionary.json', sorted_words)
    write_json(SHORT, short_words)
    write_json(LONG, long_words)
    write_json(BASE / 'dictionary-extra.json', extra_words)

    print(f"Merged {len(scrabble)} scrabble words; total unique: {len(sorted_words)}")
    print(f"  -> dictionary-short.json: {len(short_words)} words (<=4)")
    print(f"  -> dictionary-long.json:  {len(long_words)} words (5-8)")
    print(f"  -> dictionary-extra.json: {len(extra_words)} words (>8)")

if __name__ == '__main__':
    main()
