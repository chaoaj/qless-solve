// Q-Less Puzzle Solver
// Check if 12 dice can be used to form valid words

let diceInput = '';
let resultText = '';
let inputField;
let checkButton;
let showSolutionButton;
let resetButton;
let checkTimerBadge;
let checkTimerBarEl;
let checkTimerLabelEl;
let checkTimerIntervalId = null;
let extraLetters = 0;
let dictionary = new Set();
let dictionaryLoaded = false;
let longDictionaryLoaded = false;
let longDictionaryPromise = null;
let checkInProgress = false;
let checkProgressText = '';
let checkDeadlineMs = null;
const thinkingIntervals = new Map();
const SOLVER_TIMEOUT_MS = 120000;
const GRID_SIZE = 20;
const QUICK_SOLUTION_LIMIT = 1;
const LAYOUT_MAX_WIDTH = 800;
const MOBILE_BREAKPOINT = 520;
const PAGE_GUTTER = 16;
const BUTTON_GAP = 12;
const TIMER_TOP_CLEARANCE_DESKTOP = 56;
const TIMER_TOP_CLEARANCE_MOBILE = 68;
const COMMON_WORDS = new Set([
  'about', 'after', 'again', 'air', 'all', 'also', 'an', 'and', 'any', 'as', 'at', 'back', 'be', 'because',
  'been', 'before', 'between', 'big', 'book', 'both', 'boy', 'but', 'by', 'call', 'can', 'change', 'come',
  'could', 'day', 'did', 'different', 'do', 'does', 'dont', 'down', 'each', 'end', 'even', 'every', 'eye',
  'fact', 'few', 'find', 'first', 'for', 'form', 'from', 'game', 'get', 'girl', 'give', 'go', 'good', 'great',
  'group', 'hand', 'have', 'he', 'head', 'help', 'her', 'here', 'high', 'him', 'his', 'home', 'house', 'how',
  'if', 'important', 'in', 'into', 'is', 'it', 'its', 'just', 'keep', 'kind', 'know', 'large', 'last', 'late',
  'learn', 'left', 'less', 'let', 'life', 'light', 'line', 'little', 'long', 'look', 'made', 'make', 'man',
  'many', 'may', 'me', 'mean', 'men', 'might', 'more', 'most', 'move', 'much', 'must', 'my', 'name', 'need',
  'never', 'new', 'next', 'no', 'not', 'now', 'number', 'of', 'off', 'old', 'on', 'one', 'only', 'open', 'or',
  'other', 'our', 'out', 'over', 'own', 'part', 'people', 'place', 'point', 'put', 'quick', 'read', 'right',
  'run', 'same', 'saw', 'say', 'school', 'see', 'seem', 'set', 'she', 'show', 'side', 'small', 'so', 'some',
  'something', 'sound', 'start', 'state', 'still', 'such', 'take', 'tell', 'than', 'that', 'the', 'their',
  'them', 'then', 'there', 'these', 'they', 'thing', 'think', 'this', 'those', 'three', 'through', 'time', 'to',
  'together', 'too', 'try', 'turn', 'two', 'under', 'up', 'us', 'use', 'very', 'want', 'water', 'way', 'we',
  'well', 'went', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'why', 'will', 'with', 'word',
  'work', 'world', 'would', 'write', 'year', 'you', 'your'
]);
let currentSolutions = [];
let solutionVisible = false;
let solutionList;
let solutionCheckLabel;
let solutionCheckInput;
let solutionCheckButton;
let solutionCheckResult;
let wordLookupLabel;
let wordLookupInput;
let wordLookupButton;
let wordLookupResult;
let appCanvas;
let layout = null;

// Load the short dictionary eagerly; load 5-8 letter words on demand.
function preload() {
  loadJSON('dictionary-short.json', (data) => {
    dictionary = new Set(data);
    dictionaryLoaded = true;
    console.log(`Short dictionary loaded with ${dictionary.size} words`);
  }, (error) => {
    console.error('Error loading dictionary-short.json:', error);
    dictionaryLoaded = true; // unblock draw so the error is visible
    resultText = 'Error: Could not load dictionary. Try refreshing.';
  });
}

function loadLongDictionary() {
  if (longDictionaryLoaded) {
    return Promise.resolve();
  }

  if (longDictionaryPromise) {
    return longDictionaryPromise;
  }

  longDictionaryPromise = fetch('dictionary-long.json')
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((data) => {
      for (const word of data) {
        dictionary.add(word);
      }
      longDictionaryLoaded = true;
      console.log(`Long dictionary loaded. Total words now ${dictionary.size}`);
    })
    .catch((error) => {
      // Allow retry after failures.
      longDictionaryPromise = null;
      console.error('Error loading dictionary-long.json:', error);
      throw error;
    });

  return longDictionaryPromise;
}

function setup() {
  appCanvas = createCanvas(LAYOUT_MAX_WIDTH, 600);
  textAlign(CENTER, CENTER);

  // Create input field for dice
  inputField = createInput('');
  inputField.addClass('app-input');
  inputField.attribute('placeholder', 'Enter 12 dice letters (e.g., abcdefghijkl)');
  inputField.attribute('maxlength', '12');

  // Create check button
  checkButton = createButton('Check if Solvable');
  checkButton.addClass('app-button');
  checkButton.mousePressed(checkSolvable);

  // Create show solution button
  showSolutionButton = createButton('Show Solution');
  showSolutionButton.addClass('app-button');
  showSolutionButton.mousePressed(showSolution);
  showSolutionButton.hide(); // Hidden until there's a solution

  resetButton = createButton('Reset');
  resetButton.addClass('app-button');
  resetButton.addClass('app-button--secondary');
  resetButton.mousePressed(resetPuzzle);

  checkTimerBadge = createDiv(
    `<div class="check-timer-badge__label">THINKING ${SOLVER_TIMEOUT_MS / 1000}s</div><div class="check-timer-badge__bar"></div>`
  );
  checkTimerBadge.addClass('check-timer-badge');
  checkTimerBadge.style('--check-timer-duration', `${SOLVER_TIMEOUT_MS}ms`);
  checkTimerLabelEl = checkTimerBadge.elt.querySelector('.check-timer-badge__label');
  checkTimerBarEl = checkTimerBadge.elt.querySelector('.check-timer-badge__bar');
  checkTimerBadge.hide();

  solutionList = createDiv('');
  solutionList.class('solution-list');
  solutionList.hide();

  solutionCheckLabel = createDiv('Check a proposed solution against the current dice');
  solutionCheckLabel.class('tool-label');

  solutionCheckInput = createInput('');
  solutionCheckInput.addClass('app-input');
  solutionCheckInput.attribute('placeholder', 'Enter words separated by spaces or commas');

  solutionCheckButton = createButton('Check Solution');
  solutionCheckButton.addClass('app-button');
  solutionCheckButton.mousePressed(checkUserSolution);

  solutionCheckResult = createDiv('');
  solutionCheckResult.class('tool-result');

  wordLookupLabel = createDiv('Look up whether a word exists in the dictionary');
  wordLookupLabel.class('tool-label');

  wordLookupInput = createInput('');
  wordLookupInput.addClass('app-input');
  wordLookupInput.attribute('placeholder', 'Enter a single word');

  wordLookupButton = createButton('Lookup Word');
  wordLookupButton.addClass('app-button');
  wordLookupButton.mousePressed(lookupWord);

  wordLookupResult = createDiv('');
  wordLookupResult.class('tool-result');

  updateLayout();

  resultText = '';
  extraLetters = 0;
  currentSolutions = [];
  solutionVisible = false;
}

function windowResized() {
  updateLayout();
}

function getViewportWidth() {
  const docWidth = document.documentElement ? document.documentElement.clientWidth : LAYOUT_MAX_WIDTH;
  return Math.max(320, Math.min(windowWidth || LAYOUT_MAX_WIDTH, docWidth || LAYOUT_MAX_WIDTH));
}

function getDiceLayout(contentWidth, mobile, letterCount = 12) {
  const columns = Math.min(6, Math.max(1, letterCount));
  const gap = mobile ? 8 : 10;
  const minTileSize = mobile ? 36 : 40;
  const maxTileSize = mobile ? 44 : 50;
  const horizontalPadding = mobile ? 8 : 20;
  const usableWidth = Math.max(120, contentWidth - horizontalPadding * 2);
  const tileSize = Math.max(
    minTileSize,
    Math.min(maxTileSize, Math.floor((usableWidth - gap * (columns - 1)) / columns))
  );
  const rows = Math.ceil(letterCount / columns);
  const totalHeight = rows * tileSize + Math.max(0, rows - 1) * gap;

  return {columns, gap, rows, tileSize, totalHeight};
}

function layoutToolSection(label, input, button, result, top, contentLeft, contentWidth, mobile) {
  label.position(contentLeft, top);

  const inputTop = top + (mobile ? 40 : 36);
  const inputHeight = mobile ? 46 : 36;
  const buttonHeight = mobile ? 46 : 36;
  const buttonWidth = mobile ? contentWidth : 150;
  const resultHeight = mobile ? 64 : 52;

  if (mobile) {
    input.position(contentLeft, inputTop);
    input.size(contentWidth, inputHeight);

    button.position(contentLeft, inputTop + inputHeight + 10);
    button.size(contentWidth, buttonHeight);

    result.position(contentLeft, inputTop + inputHeight + 10 + buttonHeight + 12);
    result.size(contentWidth, resultHeight);

    return inputTop + inputHeight + 10 + buttonHeight + 12 + resultHeight;
  }

  input.position(contentLeft, inputTop);
  input.size(contentWidth - buttonWidth - BUTTON_GAP, inputHeight);

  button.position(contentLeft + contentWidth - buttonWidth, inputTop);
  button.size(buttonWidth, buttonHeight);

  result.position(contentLeft, inputTop + inputHeight + 12);
  result.size(contentWidth, resultHeight);

  return inputTop + inputHeight + 12 + resultHeight;
}

function updateLayout() {
  const viewportWidth = getViewportWidth();
  const contentWidth = Math.min(LAYOUT_MAX_WIDTH, viewportWidth - PAGE_GUTTER * 2);
  const contentLeft = Math.max(PAGE_GUTTER, Math.floor((viewportWidth - contentWidth) / 2));
  const mobile = contentWidth <= MOBILE_BREAKPOINT;
  const diceLayout = getDiceLayout(contentWidth, mobile);
  const topClearance = mobile ? TIMER_TOP_CLEARANCE_MOBILE : TIMER_TOP_CLEARANCE_DESKTOP;

  const titleY = (mobile ? 64 : 40) + topClearance;
  const instructionY = (mobile ? 86 : 56) + topClearance;
  const inputTop = (mobile ? 118 : 80) + topClearance;
  const inputHeight = mobile ? 46 : 40;
  const checkTop = (mobile ? 176 : 140) + topClearance;
  const resetTop = (mobile ? 234 : 140) + topClearance;
  const showTop = (mobile ? 292 : 190) + topClearance;
  const resultBoxY = (mobile ? 350 : 222) + topClearance;
  const resultBoxH = mobile ? 84 : 72;
  const solutionPromptY = (mobile ? 452 : 480) + topClearance;
  const solutionPromptH = mobile ? 56 : 34;
  const diceLabelY = (mobile ? 520 : 320) + topClearance;
  const diceStartY = (mobile ? 560 : 360) + topClearance;
  const canvasHeight = diceStartY + diceLayout.totalHeight + 56;

  resizeCanvas(contentWidth, canvasHeight);

  inputField.position(contentLeft, inputTop);
  inputField.size(contentWidth, inputHeight);

  if (mobile) {
    checkButton.position(contentLeft, checkTop);
    checkButton.size(contentWidth, 46);

    resetButton.position(contentLeft, resetTop);
    resetButton.size(contentWidth, 46);

    showSolutionButton.position(contentLeft, showTop);
    showSolutionButton.size(contentWidth, 46);
  } else {
    const checkWidth = 220;
    const resetWidth = 140;
    const groupWidth = checkWidth + BUTTON_GAP + resetWidth;
    const groupLeft = contentLeft + Math.floor((contentWidth - groupWidth) / 2);

    checkButton.position(groupLeft, checkTop);
    checkButton.size(checkWidth, 40);

    resetButton.position(groupLeft + checkWidth + BUTTON_GAP, resetTop);
    resetButton.size(resetWidth, 40);

    showSolutionButton.position(contentLeft + Math.floor((contentWidth - 220) / 2), showTop);
    showSolutionButton.size(220, 40);
  }

  const solutionListTop = canvasHeight + 24;
  const solutionListHeight = mobile ? 190 : 220;
  solutionList.position(contentLeft, solutionListTop);
  solutionList.size(contentWidth, solutionListHeight);
  solutionList.style('max-height', `${solutionListHeight}px`);

  let sectionTop = solutionListTop + solutionListHeight + 28;
  sectionTop = layoutToolSection(
    solutionCheckLabel,
    solutionCheckInput,
    solutionCheckButton,
    solutionCheckResult,
    sectionTop,
    contentLeft,
    contentWidth,
    mobile
  ) + 28;

  sectionTop = layoutToolSection(
    wordLookupLabel,
    wordLookupInput,
    wordLookupButton,
    wordLookupResult,
    sectionTop,
    contentLeft,
    contentWidth,
    mobile
  ) + 32;

  document.body.style.minHeight = `${sectionTop}px`;

  layout = {
    mobile,
    titleY,
    instructionY,
    resultBoxY,
    resultBoxH,
    solutionPromptY,
    solutionPromptH,
    diceLabelY,
    diceStartY,
    diceLayout
  };
}

function draw() {
  if (!layout) {
    return;
  }

  background(220);

  // Title
  fill(0);
  textSize(layout.mobile ? 22 : 24);
  textStyle(BOLD);
  text('Q-Less Puzzle Solver', width / 2, layout.titleY);

  // Instructions
  textSize(layout.mobile ? 15 : 16);
  textStyle(NORMAL);
  text('Enter all 12 dice letters (no spaces)', 16, layout.instructionY, width - 32, 30);

  // Show loading status
  if (!dictionaryLoaded) {
    textSize(layout.mobile ? 17 : 18);
    fill(200, 100, 0);
    text('Loading dictionary, please wait...', 16, layout.resultBoxY, width - 32, layout.resultBoxH);
    return;
  }

  // Result display
  const dotCount = Math.floor((millis() / 350) % 3) + 1;
  const animatedText = checkInProgress
    ? `${checkProgressText}${'.'.repeat(dotCount)}`
    : resultText;

  textSize(layout.mobile ? 18 : 20);
  fill(0, 100, 0);
  if (checkInProgress) {
    fill(200, 100, 0);
  } else if (extraLetters === 0 && resultText.toLowerCase().includes('solvable')) {
    fill(0, 150, 0);
  } else if (extraLetters > 0) {
    fill(200, 50, 0);
  }
  text(animatedText, 16, layout.resultBoxY, width - 32, layout.resultBoxH);

  if (!solutionVisible && currentSolutions.length > 0) {
    textSize(layout.mobile ? 16 : 18);
    fill(0, 0, 150);
    text('Press "Show Solution" to view the first solution.', 16, layout.solutionPromptY, width - 32, layout.solutionPromptH);
  }

  // Show dice if entered
  if (diceInput.length > 0) {
    textSize(layout.mobile ? 15 : 16);
    fill(0);
    text('Your dice:', width / 2, layout.diceLabelY);

    const {columns, gap, tileSize} = layout.diceLayout;

    for (let i = 0; i < diceInput.length; i++) {
      const row = Math.floor(i / columns);
      const column = i % columns;
      const itemsInRow = Math.min(columns, diceInput.length - row * columns);
      const rowWidth = itemsInRow * tileSize + Math.max(0, itemsInRow - 1) * gap;
      const rowStartX = (width - rowWidth) / 2 + tileSize / 2;
      const x = rowStartX + column * (tileSize + gap);
      const y = layout.diceStartY + row * (tileSize + gap);

      // Draw tile
      fill(255);
      stroke(0);
      strokeWeight(layout.mobile ? 1.5 : 2);
      rect(x - tileSize / 2, y - tileSize / 2, tileSize, tileSize, layout.mobile ? 8 : 10);

      // Draw letter
      fill(0);
      textSize(layout.mobile ? 22 : 24);
      textStyle(BOLD);
      text(diceInput[i].toUpperCase(), x, y);
    }
  }
}

async function checkSolvable() {
  if (!dictionaryLoaded) return;

  diceInput = inputField.value().toLowerCase().replace(/[^a-z]/g, '');

  if (diceInput.length !== 12) {
    checkInProgress = false;
    checkDeadlineMs = null;
    stopCheckTimer();
    resultText = 'Please enter exactly 12 letters';
    extraLetters = -1;
    currentSolutions = [];
    solutionVisible = false;
    renderSolutions();
    showSolutionButton.hide();
    return;
  }

  checkInProgress = true;
  checkDeadlineMs = Date.now() + SOLVER_TIMEOUT_MS;
  startCheckTimer();

  if (!longDictionaryLoaded) {
    checkProgressText = 'Loading long dictionary';
    try {
      await loadLongDictionary();
    } catch (error) {
      checkInProgress = false;
      checkDeadlineMs = null;
      stopCheckTimer();
      resultText = 'Error: Could not load long dictionary.';
      return;
    }
  }

  checkProgressText = 'Checking puzzle';
  await new Promise((resolve) => setTimeout(resolve, 0));

  runCheck();
}

function runCheck() {
  diceInput = inputField.value().toLowerCase().replace(/[^a-z]/g, '');

  // Convert dice to letter counts
  const diceCounts = {};
  for (let letter of diceInput) {
    diceCounts[letter] = (diceCounts[letter] || 0) + 1;
  }

  const deadline = checkDeadlineMs || (Date.now() + SOLVER_TIMEOUT_MS);
  let solutions = [];

  try {
    // Stop as soon as the first valid interlocking solution is found.
    solutions = findUpToSolutionSets(diceCounts, QUICK_SOLUTION_LIMIT, deadline);
  } catch (error) {
    if (error && error.message === 'SOLVER_TIMEOUT') {
      resultText = `\u2717 Search exceeded ${SOLVER_TIMEOUT_MS / 1000} seconds. Declaring puzzle unsolvable.`;
      extraLetters = -1;
      currentSolutions = [];
      solutionVisible = false;
      renderSolutions();
      showSolutionButton.hide();
      checkInProgress = false;
      checkDeadlineMs = null;
      stopCheckTimer();
      return;
    }

    throw error;
  }

  if (solutions.length > 0) {
    resultText = '\u2713 Puzzle is SOLVABLE! Found the first interlocking solution.';
    extraLetters = 0;
    currentSolutions = solutions;
    solutionVisible = false;
    renderSolutions();
    showSolutionButton.show();
  } else {
    // Find minimum extra letters
    let minExtra;
    try {
      minExtra = findMinimumExtra(diceCounts, deadline);
    } catch (error) {
      if (error && error.message === 'SOLVER_TIMEOUT') {
        resultText = `\u2717 Search exceeded ${SOLVER_TIMEOUT_MS / 1000} seconds. Declaring puzzle unsolvable.`;
        extraLetters = -1;
        currentSolutions = [];
        solutionVisible = false;
        renderSolutions();
        showSolutionButton.hide();
        checkInProgress = false;
        checkDeadlineMs = null;
        stopCheckTimer();
        return;
      }

      throw error;
    }
    extraLetters = minExtra;
    currentSolutions = [];
    solutionVisible = false;
    renderSolutions();
    showSolutionButton.hide();

    if (minExtra === 0) {
      resultText = '\u2713 All 12 dice can be used, but no interlocking word set was found.';
    } else {
      resultText = `\u2717 Cannot use all dice with interlocking words. Minimum ${minExtra} letter${minExtra > 1 ? 's' : ''} left over.`;
    }
  }

  checkInProgress = false;
  checkDeadlineMs = null;
  stopCheckTimer();
}

function findUpToSolutionSets(diceCounts, maxSolutions, deadline = Date.now() + SOLVER_TIMEOUT_MS) {
  const uniqueSolutions = [];
  const seen = new Set();
  collectUpToSolutionSets(diceCounts, diceCounts, [], maxSolutions, uniqueSolutions, seen, {}, deadline);
  return uniqueSolutions;
}

function collectUpToSolutionSets(initialCounts, remainingCounts, words, maxSolutions, uniqueSolutions, seen, connectableCounts, deadline) {
  ensureWithinDeadline(deadline);

  if (uniqueSolutions.length >= maxSolutions) {
    return;
  }

  if (isAllUsed(remainingCounts)) {
    if (words.length >= 2) {
      const key = [...words].sort().join('|');
      if (!seen.has(key)) {
        if (isSolutionPlayableOnGrid(words, initialCounts, deadline)) {
          seen.add(key);
          uniqueSolutions.push([...words]);
        }
      }
    }
    return;
  }

  const possiblePlacements = findPossiblePlacements(initialCounts, remainingCounts, words.length, connectableCounts, deadline);

  for (let placement of possiblePlacements) {
    ensureWithinDeadline(deadline);

    if (uniqueSolutions.length >= maxSolutions) {
      return;
    }

    const newCounts = useWord(remainingCounts, placement.word, placement.overlapLetter);
    const nextConnectableCounts = getNextConnectableCounts(connectableCounts, placement.wordCounts, placement.overlapLetter);
    collectUpToSolutionSets(
      initialCounts,
      newCounts,
      [...words, placement.word],
      maxSolutions,
      uniqueSolutions,
      seen,
      nextConnectableCounts,
      deadline
    );
  }
}

function isSolutionPlayableOnGrid(words, diceCounts, deadline = Date.now() + SOLVER_TIMEOUT_MS) {
  ensureWithinDeadline(deadline);

  if (!words || words.length < 2) {
    return false;
  }

  const board = new Map();
  const remainingCounts = {...diceCounts};
  const remainingWords = words.map((word) => String(word));

  return canPlaceAllWordsOnGrid(board, remainingCounts, remainingWords, true, deadline);
}

function canPlaceAllWordsOnGrid(board, remainingCounts, remainingWords, isFirstWord, deadline) {
  ensureWithinDeadline(deadline);

  if (remainingWords.length === 0) {
    return isAllUsed(remainingCounts);
  }

  const orderedWords = [...remainingWords].sort((a, b) => b.length - a.length);

  for (let word of orderedWords) {
    ensureWithinDeadline(deadline);

    const placements = getWordPlacementCandidates(word, board, isFirstWord, deadline);
    if (placements.length === 0) {
      continue;
    }

    const nextRemainingWords = removeOneWord(remainingWords, word);

    for (let placement of placements) {
      ensureWithinDeadline(deadline);

      const applied = tryApplyWordToBoard(word, placement, board, remainingCounts, isFirstWord, deadline);
      if (!applied) {
        continue;
      }

      if (canPlaceAllWordsOnGrid(applied.board, applied.remainingCounts, nextRemainingWords, false, deadline)) {
        return true;
      }
    }
  }

  return false;
}

function getWordPlacementCandidates(word, board, isFirstWord, deadline) {
  ensureWithinDeadline(deadline);

  if (isFirstWord) {
    const center = Math.floor(GRID_SIZE / 2);
    const horizontalStart = center - Math.floor(word.length / 2);
    const verticalStart = center - Math.floor(word.length / 2);

    return [
      {row: center, col: horizontalStart, dir: 'H'},
      {row: verticalStart, col: center, dir: 'V'}
    ];
  }

  const seen = new Set();
  const placements = [];

  for (let [key, boardLetter] of board.entries()) {
    ensureWithinDeadline(deadline);

    const [row, col] = parseBoardKey(key);

    for (let i = 0; i < word.length; i++) {
      if (word[i] !== boardLetter) {
        continue;
      }

      const horizontal = {row, col: col - i, dir: 'H'};
      const vertical = {row: row - i, col, dir: 'V'};

      const hKey = `${horizontal.row}:${horizontal.col}:H`;
      const vKey = `${vertical.row}:${vertical.col}:V`;

      if (!seen.has(hKey)) {
        seen.add(hKey);
        placements.push(horizontal);
      }

      if (!seen.has(vKey)) {
        seen.add(vKey);
        placements.push(vertical);
      }
    }
  }

  return placements;
}

function tryApplyWordToBoard(word, placement, board, remainingCounts, isFirstWord, deadline) {
  ensureWithinDeadline(deadline);

  const horizontal = placement.dir === 'H';
  const dr = horizontal ? 0 : 1;
  const dc = horizontal ? 1 : 0;

  const endRow = placement.row + dr * (word.length - 1);
  const endCol = placement.col + dc * (word.length - 1);
  if (!isInsideGrid(placement.row, placement.col) || !isInsideGrid(endRow, endCol)) {
    return null;
  }

  const beforeRow = placement.row - dr;
  const beforeCol = placement.col - dc;
  const afterRow = endRow + dr;
  const afterCol = endCol + dc;
  if (isInsideGrid(beforeRow, beforeCol) && board.has(toBoardKey(beforeRow, beforeCol))) {
    return null;
  }
  if (isInsideGrid(afterRow, afterCol) && board.has(toBoardKey(afterRow, afterCol))) {
    return null;
  }

  let overlapCount = 0;
  let newTileCount = 0;
  const stagedLetters = [];
  const nextRemainingCounts = {...remainingCounts};

  for (let i = 0; i < word.length; i++) {
    ensureWithinDeadline(deadline);

    const row = placement.row + dr * i;
    const col = placement.col + dc * i;
    const letter = word[i];
    const key = toBoardKey(row, col);
    const existing = board.get(key);

    if (existing) {
      if (existing !== letter) {
        return null;
      }

      overlapCount += 1;
      continue;
    }

    if ((nextRemainingCounts[letter] || 0) <= 0) {
      return null;
    }

    nextRemainingCounts[letter] -= 1;
    newTileCount += 1;
    stagedLetters.push({row, col, letter});

    const crossWord = buildPerpendicularWord(board, stagedLetters, row, col, letter, placement.dir);
    if (crossWord.length > 1 && !dictionary.has(crossWord)) {
      return null;
    }
  }

  if (!isFirstWord && overlapCount === 0) {
    return null;
  }

  if (newTileCount === 0) {
    return null;
  }

  const nextBoard = new Map(board);
  for (let tile of stagedLetters) {
    nextBoard.set(toBoardKey(tile.row, tile.col), tile.letter);
  }

  const placedMainWord = buildWordFromBoard(nextBoard, placement.row, placement.col, placement.dir);
  if (placedMainWord !== word || !dictionary.has(placedMainWord)) {
    return null;
  }

  return {board: nextBoard, remainingCounts: nextRemainingCounts};
}

function buildPerpendicularWord(board, stagedLetters, row, col, letter, dir) {
  const stagedLookup = new Map();
  for (let tile of stagedLetters) {
    stagedLookup.set(toBoardKey(tile.row, tile.col), tile.letter);
  }

  const horizontal = dir === 'H';
  const dr = horizontal ? 1 : 0;
  const dc = horizontal ? 0 : 1;

  let startRow = row;
  let startCol = col;
  while (isInsideGrid(startRow - dr, startCol - dc) && getBoardLetter(board, stagedLookup, startRow - dr, startCol - dc) !== null) {
    startRow -= dr;
    startCol -= dc;
  }

  let letters = '';
  let currentRow = startRow;
  let currentCol = startCol;
  while (isInsideGrid(currentRow, currentCol)) {
    const value = getBoardLetter(board, stagedLookup, currentRow, currentCol);
    if (value === null) {
      break;
    }

    letters += value;
    currentRow += dr;
    currentCol += dc;
  }

  if (letters.length === 0) {
    return letter;
  }

  return letters;
}

function buildWordFromBoard(board, row, col, dir) {
  const horizontal = dir === 'H';
  const dr = horizontal ? 0 : 1;
  const dc = horizontal ? 1 : 0;

  let startRow = row;
  let startCol = col;
  while (isInsideGrid(startRow - dr, startCol - dc) && board.has(toBoardKey(startRow - dr, startCol - dc))) {
    startRow -= dr;
    startCol -= dc;
  }

  let letters = '';
  let currentRow = startRow;
  let currentCol = startCol;
  while (isInsideGrid(currentRow, currentCol)) {
    const value = board.get(toBoardKey(currentRow, currentCol));
    if (!value) {
      break;
    }

    letters += value;
    currentRow += dr;
    currentCol += dc;
  }

  return letters;
}

function getBoardLetter(board, stagedLookup, row, col) {
  const key = toBoardKey(row, col);
  if (stagedLookup.has(key)) {
    return stagedLookup.get(key);
  }

  return board.get(key) || null;
}

function removeOneWord(words, target) {
  const next = [...words];
  const index = next.indexOf(target);
  if (index >= 0) {
    next.splice(index, 1);
  }
  return next;
}

function isInsideGrid(row, col) {
  return row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE;
}

function toBoardKey(row, col) {
  return `${row},${col}`;
}

function parseBoardKey(key) {
  const parts = key.split(',');
  return [Number(parts[0]), Number(parts[1])];
}

function showSolution() {
  if (currentSolutions.length === 0) {
    return;
  }

  solutionVisible = true;
  renderSolutions();

  // Display solution words
  console.log('Solutions:', currentSolutions);

  // Calculate letters used
  const lettersUsed = diceInput.length;
  for (let solution of currentSolutions) {
    const overlapCount = solution.reduce((sum, word) => sum + word.length, 0) - lettersUsed;
    console.log(`Letters used: ${lettersUsed}/12, Interlocking overlaps: ${overlapCount}`);
  }
}

function resetPuzzle() {
  window.location.reload();
}

async function checkUserSolution() {
  if (!dictionaryLoaded) {
    setToolResult(solutionCheckResult, 'Dictionary is still loading.', 'warning');
    return;
  }

  startThinkingResult(solutionCheckResult, 'Checking solution');

  const wordsPrecheck = parseWords(solutionCheckInput.value());
  if (wordsPrecheck.some((w) => w.length > 4 && w.length <= 8) && !longDictionaryLoaded) {
    startThinkingResult(solutionCheckResult, 'Loading long dictionary');
    try {
      await loadLongDictionary();
    } catch (error) {
      stopThinkingResult(solutionCheckResult);
      setToolResult(solutionCheckResult, 'Error: Could not load long dictionary.', 'error');
      return;
    }
    startThinkingResult(solutionCheckResult, 'Checking solution');
  }

  const currentDice = inputField.value().toLowerCase().replace(/[^a-z]/g, '');
  if (currentDice.length !== 12) {
    stopThinkingResult(solutionCheckResult);
    setToolResult(solutionCheckResult, 'Enter exactly 12 dice letters before checking a solution.', 'warning');
    return;
  }

  const words = parseWords(solutionCheckInput.value());
  if (words.length === 0) {
    stopThinkingResult(solutionCheckResult);
    setToolResult(solutionCheckResult, 'Enter at least two words to check a solution.', 'warning');
    return;
  }

  if (words.length < 2) {
    stopThinkingResult(solutionCheckResult);
    setToolResult(solutionCheckResult, 'A valid solution must contain at least two interlocking words.', 'warning');
    return;
  }

  const invalidWords = words.filter((word) => word.length < 3 || !dictionary.has(word));
  if (invalidWords.length > 0) {
    stopThinkingResult(solutionCheckResult);
    setToolResult(solutionCheckResult, `These words are not valid dictionary entries: ${invalidWords.join(', ')}.`, 'error');
    return;
  }

  const diceCounts = getCountsFromLetters(currentDice);
  const orderedSolution = findUserSolutionOrder(diceCounts, diceCounts, words.map((word, index) => ({word, index})), [], {});

  if (!orderedSolution) {
    stopThinkingResult(solutionCheckResult);
    setToolResult(solutionCheckResult, 'Not a valid solution for the current dice. The entered words do not use all 12 dice as one interlocking set.', 'error');
    return;
  }

  try {
    if (!isSolutionPlayableOnGrid(orderedSolution, diceCounts)) {
      stopThinkingResult(solutionCheckResult);
      setToolResult(solutionCheckResult, 'Invalid board play. These words cannot be placed on a 20x20 grid with Scrabble-style adjacent-word rules.', 'error');
      return;
    }
  } catch (error) {
    stopThinkingResult(solutionCheckResult);
    if (error && error.message === 'SOLVER_TIMEOUT') {
      setToolResult(solutionCheckResult, `Validation exceeded ${SOLVER_TIMEOUT_MS / 1000} seconds. Declaring solution invalid.`, 'error');
      return;
    }

    throw error;
  }

  stopThinkingResult(solutionCheckResult);
  setToolResult(solutionCheckResult, `Valid solution. Working order: ${orderedSolution.join(' | ')}.`, 'success');
}

async function lookupWord() {
  if (!dictionaryLoaded) {
    setToolResult(wordLookupResult, 'Dictionary is still loading.', 'warning');
    return;
  }

  const word = wordLookupInput.value().toLowerCase().replace(/[^a-z]/g, '');
  if (word.length === 0) {
    setToolResult(wordLookupResult, 'Enter a word to look up.', 'warning');
    return;
  }

  startThinkingResult(wordLookupResult, 'Looking up word');

  if (word.length > 4 && word.length <= 8 && !longDictionaryLoaded) {
    startThinkingResult(wordLookupResult, 'Loading long dictionary');
    try {
      await loadLongDictionary();
    } catch (error) {
      stopThinkingResult(wordLookupResult);
      setToolResult(wordLookupResult, 'Error: Could not load long dictionary.', 'error');
      return;
    }
    startThinkingResult(wordLookupResult, 'Looking up word');
  }

  stopThinkingResult(wordLookupResult);
  if (dictionary.has(word)) {
    setToolResult(wordLookupResult, `${word} exists in the dictionary.`, 'success');
  } else {
    setToolResult(wordLookupResult, `${word} was not found in the dictionary.`, 'error');
  }
}

function setToolResult(element, message, status) {
  element.html(message);
  element.class(`tool-result tool-result--${status}`);
}

function startThinkingResult(element, baseText) {
  stopThinkingResult(element);

  let dotCount = 1;
  setToolResult(element, `${baseText}.`, 'warning');

  const timerId = setInterval(() => {
    dotCount = (dotCount % 3) + 1;
    setToolResult(element, `${baseText}${'.'.repeat(dotCount)}`, 'warning');
  }, 320);

  thinkingIntervals.set(element, timerId);
}

function stopThinkingResult(element) {
  const timerId = thinkingIntervals.get(element);
  if (!timerId) {
    return;
  }

  clearInterval(timerId);
  thinkingIntervals.delete(element);
}

function startCheckTimer() {
  stopCheckTimer();
  if (!checkDeadlineMs || !checkTimerBadge) {
    return;
  }

  // Keep the CSS variable in sync when timeout changes.
  checkTimerBadge.style('--check-timer-duration', `${SOLVER_TIMEOUT_MS}ms`);

  // Show first, then reset animation so the countdown always starts visible.
  checkTimerBadge.show();
  if (checkTimerBarEl) {
    checkTimerBarEl.style.animation = 'none';
    checkTimerBarEl.style.transform = 'scaleX(1)';
    void checkTimerBarEl.offsetWidth;
    checkTimerBarEl.style.animation = '';
  }

  checkTimerBadge.addClass('check-timer-badge--active');

  updateCheckTimerLabel();
  checkTimerIntervalId = setInterval(() => {
    if (!checkDeadlineMs) {
      return;
    }

    updateCheckTimerLabel();
  }, 150);
}

function stopCheckTimer() {
  if (checkTimerIntervalId) {
    clearInterval(checkTimerIntervalId);
    checkTimerIntervalId = null;
  }

  if (checkTimerBadge) {
    checkTimerBadge.removeClass('check-timer-badge--active');

    // Reset visual state so the next run starts from a full bar.
    if (checkTimerBarEl) {
      checkTimerBarEl.style.animation = 'none';
      checkTimerBarEl.style.transform = 'scaleX(1)';
      void checkTimerBarEl.offsetWidth;
      checkTimerBarEl.style.animation = '';
    }

    checkTimerBadge.hide();
  }

  if (checkTimerLabelEl) {
    checkTimerLabelEl.textContent = `THINKING ${SOLVER_TIMEOUT_MS / 1000}s`;
  }
}

function updateCheckTimerLabel() {
  if (!checkTimerLabelEl) {
    return;
  }

  const remainingMs = Math.max(0, (checkDeadlineMs || Date.now()) - Date.now());
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  checkTimerLabelEl.textContent = `THINKING ${remainingSeconds}s`;
}

function parseWords(value) {
  return value.toLowerCase().match(/[a-z]+/g) || [];
}

function getCountsFromLetters(letters) {
  const counts = {};
  for (let letter of letters) {
    counts[letter] = (counts[letter] || 0) + 1;
  }
  return counts;
}

function findUserSolutionOrder(initialCounts, remainingCounts, remainingWords, placedWords, connectableCounts) {
  if (remainingWords.length === 0) {
    if (placedWords.length >= 2 && isAllUsed(remainingCounts)) {
      return placedWords;
    }

    return null;
  }

  for (let wordEntry of remainingWords) {
    const nextWords = remainingWords.filter((entry) => entry.index !== wordEntry.index);
    const wordCounts = getLetterCounts(wordEntry.word);

    if (placedWords.length === 0) {
      if (!canPlaceWord(wordCounts, remainingCounts)) {
        continue;
      }

      const nextCounts = useWord(remainingCounts, wordEntry.word);
      const nextConnectableCounts = getNextConnectableCounts(connectableCounts, wordCounts);
      const result = findUserSolutionOrder(initialCounts, nextCounts, nextWords, [...placedWords, wordEntry.word], nextConnectableCounts);
      if (result) {
        return result;
      }

      continue;
    }

    for (let overlapLetter in wordCounts) {
      if (!(connectableCounts[overlapLetter] > 0)) {
        continue;
      }

      if (!canPlaceWord(wordCounts, remainingCounts, overlapLetter)) {
        continue;
      }

      const nextCounts = useWord(remainingCounts, wordEntry.word, overlapLetter);
      const nextConnectableCounts = getNextConnectableCounts(connectableCounts, wordCounts, overlapLetter);
      const result = findUserSolutionOrder(initialCounts, nextCounts, nextWords, [...placedWords, wordEntry.word], nextConnectableCounts);
      if (result) {
        return result;
      }
    }
  }

  return null;
}

function renderSolutions() {
  if (!solutionVisible || currentSolutions.length === 0) {
    solutionList.html('');
    solutionList.hide();
    return;
  }

  const title = '1 solution';
  const items = currentSolutions
    .map((solution) => `<li>${solution.join(' | ')}</li>`)
    .join('');

  solutionList.html(`<div class="solution-list__title">${title}</div><ol>${items}</ol>`);
  solutionList.show();
}

// Backtracking algorithm to find all ways the dice can be used by interlocking words
function findAllSolutions(initialCounts, remainingCounts, words, memo, connectableCounts = {}, deadline = Date.now() + SOLVER_TIMEOUT_MS) {
  ensureWithinDeadline(deadline);

  const stateKey = getStateKey(remainingCounts, words.length, connectableCounts);
  if (memo.has(stateKey)) {
    return cloneSolutions(memo.get(stateKey));
  }

  if (isAllUsed(remainingCounts)) {
    const completeSolutions = words.length >= 2 ? [[]] : [];
    memo.set(stateKey, completeSolutions);
    return cloneSolutions(completeSolutions);
  }

  const possiblePlacements = findPossiblePlacements(initialCounts, remainingCounts, words.length, connectableCounts, deadline);
  const solutions = [];

  for (let placement of possiblePlacements) {
    ensureWithinDeadline(deadline);

    const newCounts = useWord(remainingCounts, placement.word, placement.overlapLetter);
    const nextConnectableCounts = getNextConnectableCounts(connectableCounts, placement.wordCounts, placement.overlapLetter);
    const suffixes = findAllSolutions(initialCounts, newCounts, [...words, placement.word], memo, nextConnectableCounts, deadline);

    for (let suffix of suffixes) {
      solutions.push([placement.word, ...suffix]);
    }
  }

  const uniqueSolutions = dedupeOrderedSolutions(solutions);
  memo.set(stateKey, uniqueSolutions);
  return cloneSolutions(uniqueSolutions);
}

function isAllUsed(diceCounts) {
  for (let letter in diceCounts) {
    if (diceCounts[letter] > 0) {
      return false;
    }
  }
  return true;
}

function getRemainingLetters(diceCounts) {
  let letters = '';
  for (let letter in diceCounts) {
    letters += letter.repeat(diceCounts[letter]);
  }
  return letters;
}

function getLetterCounts(word) {
  const counts = {};
  for (let letter of word) {
    counts[letter] = (counts[letter] || 0) + 1;
  }
  return counts;
}

function getUsedLetterCounts(initialCounts, remainingCounts) {
  const usedCounts = {};
  for (let letter in initialCounts) {
    const used = initialCounts[letter] - (remainingCounts[letter] || 0);
    if (used > 0) {
      usedCounts[letter] = used;
    }
  }
  return usedCounts;
}

function getStateKey(remainingCounts, wordCount, connectableCounts = {}) {
  const stage = Math.min(wordCount, 2);
  const remaining = Object.keys(remainingCounts)
    .sort()
    .map((letter) => `${letter}:${remainingCounts[letter]}`)
    .join(',');
  const connectable = Object.keys(connectableCounts)
    .filter((letter) => connectableCounts[letter] > 0)
    .sort()
    .map((letter) => `${letter}:${connectableCounts[letter]}`)
    .join(',');

  return `${stage}|R:${remaining}|C:${connectable}`;
}

function cloneSolutions(solutions) {
  return solutions.map((solution) => [...solution]);
}

function dedupeOrderedSolutions(solutions) {
  const seen = new Set();
  const unique = [];

  for (let solution of solutions) {
    const key = solution.join('|');
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(solution);
    }
  }

  return unique;
}

function dedupeSolutionSets(solutions) {
  const seen = new Set();
  const unique = [];

  for (let solution of solutions) {
    const normalized = [...solution].sort().join('|');
    if (!seen.has(normalized)) {
      seen.add(normalized);
      unique.push(solution);
    }
  }

  unique.sort((left, right) => {
    if (left.length !== right.length) {
      return left.length - right.length;
    }

    return left.join('|').localeCompare(right.join('|'));
  });

  return unique;
}

function getCommonWordScore(word) {
  let score = 0;

  if (COMMON_WORDS.has(word)) {
    score += 1000;
  }

  if (word.length <= 5) {
    score += 80;
  } else if (word.length <= 7) {
    score += 30;
  }

  // Prefer words with more common letters and fewer rare letters.
  const commonLetters = 'etaoinshrdlu';
  const rareLetters = 'jqxz';
  for (let letter of word) {
    if (commonLetters.includes(letter)) score += 2;
    if (rareLetters.includes(letter)) score -= 5;
  }

  return score;
}

function findPossiblePlacements(initialCounts, remainingCounts, wordCount, connectableCounts, deadline = Number.POSITIVE_INFINITY) {
  const possible = [];
  const remainingLetters = getRemainingLetters(remainingCounts);
  const remainingTotal = remainingLetters.length;

  for (let word of dictionary) {
    ensureWithinDeadline(deadline);

    if (word.length < 3) continue;

    const wordCounts = getLetterCounts(word);
    const commonScore = getCommonWordScore(word);

    if (wordCount === 0) {
      if (word.length >= remainingTotal - 1) continue;
      if (canPlaceWord(wordCounts, remainingCounts)) {
        possible.push({word, wordCounts, overlapLetter: null, newlyUsed: word.length, commonScore});
      }
      continue;
    }

    for (let overlapLetter in wordCounts) {
      if (!(connectableCounts[overlapLetter] > 0)) continue;
      if (canPlaceWord(wordCounts, remainingCounts, overlapLetter)) {
        possible.push({word, wordCounts, overlapLetter, newlyUsed: word.length - 1, commonScore});
      }
    }
  }

  possible.sort((a, b) =>
    b.commonScore - a.commonScore || b.newlyUsed - a.newlyUsed || a.word.length - b.word.length
  );

  return possible;
}

function canPlaceWord(wordCounts, remainingCounts, overlapLetter = null) {
  for (let letter in wordCounts) {
    const needed = wordCounts[letter] - (letter === overlapLetter ? 1 : 0);
    if (needed > (remainingCounts[letter] || 0)) {
      return false;
    }
  }

  return true;
}

function useWord(diceCounts, word, overlapLetter = null) {
  const newCounts = {...diceCounts};
  const wordCounts = getLetterCounts(word);

  for (let letter in wordCounts) {
    const used = wordCounts[letter] - (letter === overlapLetter ? 1 : 0);
    if (used > 0) {
      newCounts[letter] -= used;
    }
  }

  return newCounts;
}

function getNextConnectableCounts(connectableCounts, wordCounts, overlapLetter = null) {
  const next = {...connectableCounts};

  if (overlapLetter !== null) {
    if (!next[overlapLetter]) {
      return next;
    }

    next[overlapLetter] -= 1;
    if (next[overlapLetter] === 0) {
      delete next[overlapLetter];
    }
  }

  for (let letter in wordCounts) {
    const added = wordCounts[letter] - (letter === overlapLetter ? 1 : 0);
    if (added > 0) {
      next[letter] = (next[letter] || 0) + added;
    }
  }

  return next;
}

// Find minimum extra letters when no complete solution exists
function findMinimumExtra(diceCounts, deadline = Date.now() + SOLVER_TIMEOUT_MS) {
  ensureWithinDeadline(deadline);

  const totalLetters = Object.values(diceCounts).reduce((sum, count) => sum + count, 0);
  const maxUsed = findMaxLettersUsed(diceCounts, diceCounts, [], new Map(), {}, deadline);
  return totalLetters - maxUsed;
}

function findMaxLettersUsed(initialCounts, remainingCounts, words, memo, connectableCounts, deadline) {
  ensureWithinDeadline(deadline);

  const stateKey = getStateKey(remainingCounts, words.length, connectableCounts);
  if (memo.has(stateKey)) {
    return memo.get(stateKey);
  }

  const totalLetters = Object.values(initialCounts).reduce((sum, count) => sum + count, 0);
  const remainingLetters = Object.values(remainingCounts).reduce((sum, count) => sum + count, 0);
  let best = words.length >= 2 ? totalLetters - remainingLetters : 0;

  const possiblePlacements = findPossiblePlacements(initialCounts, remainingCounts, words.length, connectableCounts, deadline);

  for (let placement of possiblePlacements) {
    ensureWithinDeadline(deadline);

    const newCounts = useWord(remainingCounts, placement.word, placement.overlapLetter);
    const nextConnectableCounts = getNextConnectableCounts(connectableCounts, placement.wordCounts, placement.overlapLetter);
    const used = findMaxLettersUsed(initialCounts, newCounts, [...words, placement.word], memo, nextConnectableCounts, deadline);
    best = Math.max(best, used);
  }

  memo.set(stateKey, best);
  return best;
}

function ensureWithinDeadline(deadline) {
  if (Date.now() > deadline) {
    throw new Error('SOLVER_TIMEOUT');
  }
}
