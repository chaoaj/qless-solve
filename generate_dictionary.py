#!/usr/bin/env python3
"""
Generate a JSON dictionary of valid English words (3-12 letters) from NLTK
for use with the Q-Less puzzle solver.
"""

import json
import os
from nltk.corpus import words

def download_nltk_data():
    """Download required NLTK data if not already present."""
    import nltk
    try:
        words.words()
    except LookupError:
        print("Downloading NLTK words corpus...")
        nltk.download('words')

def generate_dictionary():
    """Generate dictionary of words between 3-12 letters."""
    print("Loading NLTK words corpus...")
    word_list = words.words()

    # Filter words: 3-12 letters, alphabetic only, lowercase
    filtered_words = set()
    for word in word_list:
        if word.isalpha() and 3 <= len(word) <= 12:
            filtered_words.add(word.lower())

    # Convert to sorted list
    sorted_words = sorted(list(filtered_words))

    print(f"Total words in dictionary: {len(sorted_words)}")

    base_dir = os.path.dirname(__file__)

    # Save full dictionary
    output_path = os.path.join(base_dir, 'dictionary.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(sorted_words, f, indent=2)
    print(f"Dictionary saved to: {output_path}")

    # Save split dictionaries for optimized loading:
    # short words (< 6 letters) are loaded eagerly; long words (>= 6) are lazy-loaded on demand
    short_words = [w for w in sorted_words if len(w) < 6]
    long_words = [w for w in sorted_words if len(w) >= 6]

    short_path = os.path.join(base_dir, 'dictionary-short.json')
    with open(short_path, 'w', encoding='utf-8') as f:
        json.dump(short_words, f)
    print(f"Short dictionary (<6 letters, {len(short_words)} words) saved to: {short_path}")

    long_path = os.path.join(base_dir, 'dictionary-long.json')
    with open(long_path, 'w', encoding='utf-8') as f:
        json.dump(long_words, f)
    print(f"Long dictionary (>=6 letters, {len(long_words)} words) saved to: {long_path}")

    return sorted_words

def print_statistics(word_list):
    """Print statistics about word lengths."""
    print("\nWord length distribution:")
    for length in range(3, 13):
        count = sum(1 for word in word_list if len(word) == length)
        print(f"  {length} letters: {count} words")

if __name__ == '__main__':
    download_nltk_data()
    word_list = generate_dictionary()
    print_statistics(word_list)
    print("\nDone! You can now use dictionary.json in your p5.js project.")
