# Q-Less Puzzle Solver

A p5.js application that checks if a Q-Less puzzle (12 dice) can be solved using all letters in interlocking words.

## Setup - claude --resume 81a6acba-a06a-40e9-a97b-12a115750122

### 1. Generate the Dictionary (One-time setup)

The dictionary is generated from NLTK (Natural Language Toolkit) with over 196,000 valid English words.

```bash
# Install dependencies
pip install nltk

# Generate dictionary.json
python generate_dictionary.py
```

This creates `dictionary.json` plus split dictionaries:
- `dictionary-short.json` with words of length 3-4 (loaded eagerly)
- `dictionary-long.json` with words of length 5-8 (lazy-loaded on demand)
- `dictionary-extra.json` with words of length 9-12 (generated but not used by the app)

### 2. Run the Application

Open `index.html` in a web browser, or use a local server:

```bash
# Using Python's built-in server
python3 -m http.server 8000

# Then open http://localhost:8000 in your browser
```

**Note:** Due to browser security restrictions, you need to run a local server to load the JSON dictionary file.

## How to Use

1. Enter exactly 12 letters (representing the 12 dice) in the input field
2. Click "Check if Solvable"
3. The solver will tell you:
   - ✓ **Green**: All 12 dice can be used to form valid words
   - ✗ **Red**: Shows the minimum number of letters that cannot be used
4. If a solution exists, click **"Show Solution"** to see the words needed
5. Use **Check Solution** to test whether your own word list is a valid interlocking solution for the current 12 dice
6. Use **Lookup Word** to test whether a single word exists in the dictionary

Solutions must use at least two words, and every word after the first must interlock by sharing one letter that is already in the solution.

## Features

- **Dictionary-backed Solver**: Uses NLTK-derived words with eager + lazy loading
- **Visual Display**: Shows your dice as individual tiles
- **Smart Algorithm**: Uses backtracking to find optimal word combinations
- **Real-time Feedback**: Instantly tells you if the puzzle is solvable
- **Solution Display**: Shows the exact words needed to solve the puzzle
- **Solution Checker**: Validates a user-entered solution against the current dice and interlocking rules
- **Word Lookup**: Checks whether a word exists in the dictionary

## File Structure

```
qless-solve/
├── index.html           # Main HTML file
├── sketch.js           # p5.js application code
├── style.css           # Styles
├── dictionary.json     # Word dictionary (generated)
├── dictionary-short.json # Eager dictionary (3-4 letters)
├── dictionary-long.json  # Lazy-loaded dictionary (5-8 letters)
├── dictionary-extra.json # Extra dictionary (9-12 letters, not used at runtime)
├── generate_dictionary.py  # Script to generate dictionary
├── requirements.txt    # Python dependencies
└── libraries/
    ├── p5.min.js
    └── p5.sound.min.js
```

## Algorithm

The solver uses a backtracking algorithm:
1. Picks a first word from the available letters
2. Recursively adds words that share one existing letter with the current solution
3. Counts the shared letter once against the 12 dice, and spends the remaining letters from the pool
4. If no complete interlocking solution exists, finds the minimum number of unused letters
5. Prioritizes placements that consume more new letters for better efficiency

## Dictionary Statistics

The generated dictionary contains:
- 3 letters: 1,295 words
- 4 letters: 4,995 words
- 5 letters: 9,972 words
- 6 letters: 17,464 words
- 7 letters: 23,714 words
- 8 letters: 29,842 words
- 9 letters: 32,287 words
- 10 letters: 30,824 words
- 11 letters: 25,962 words
- 12 letters: 20,447 words

**Total: 196,802 words**
