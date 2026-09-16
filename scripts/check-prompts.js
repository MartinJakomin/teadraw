import { readFileSync } from "fs";
import { resolve, join } from "path";

const rootDir = resolve(".");
const promptsPath = join(rootDir, "server/src/prompts.ts");

const fileContent = readFileSync(promptsPath, "utf-8");

// Extract only the PROMPTS array content
const startMarker = "export const PROMPTS: string[] = [";
const endMarker = "];";

const startIndex = fileContent.indexOf(startMarker);
if (startIndex === -1) {
  console.error("❌ Error: Could not find 'export const PROMPTS: string[] = [' in server/src/prompts.ts");
  process.exit(1);
}

const endIndex = fileContent.indexOf(endMarker, startIndex);
if (endIndex === -1) {
  console.error("❌ Error: Could not find closing '];' for PROMPTS in server/src/prompts.ts");
  process.exit(1);
}

const promptsBlock = fileContent.substring(startIndex + startMarker.length, endIndex);

// Extract strings from the PROMPTS array block
const regex = /"([^"\\]*(?:\\.[^"\\]*)*)"/g;
const prompts = [];
let match;
while ((match = regex.exec(promptsBlock)) !== null) {
  prompts.push(match[1].replace(/\\"/g, '"'));
}

console.log(`\n🔍 Checking Prompts in server/src/prompts.ts`);
console.log(`---------------------------------------------`);
console.log(`Loaded ${prompts.length} prompts.\n`);

if (prompts.length === 0) {
  console.error("❌ Error: No prompts found!");
  process.exit(1);
}

// 1. Check exact duplicates
const seen = new Map();
const exactDuplicates = [];

prompts.forEach((prompt, index) => {
  const norm = prompt.trim().toLowerCase();
  if (seen.has(norm)) {
    exactDuplicates.push({
      originalIndex: seen.get(norm),
      duplicateIndex: index,
      prompt,
    });
  } else {
    seen.set(norm, index);
  }
});

if (exactDuplicates.length > 0) {
  console.log(`❌ Found ${exactDuplicates.length} EXACT DUPLICATE(s):`);
  exactDuplicates.forEach((dup) => {
    console.log(
      `  - [#${dup.duplicateIndex + 1}] "${dup.prompt}" (duplicates prompt #${dup.originalIndex + 1})`
    );
  });
  console.log();
} else {
  console.log(`✅ No exact duplicates found.`);
}

// Optimized Levenshtein Distance using rolling 2-row buffer
function levenshteinDistance(s1, s2) {
  const m = s1.length;
  const n = s2.length;
  let prevRow = new Int32Array(n + 1);
  let currRow = new Int32Array(n + 1);

  for (let j = 0; j <= n; j++) prevRow[j] = j;

  for (let i = 1; i <= m; i++) {
    currRow[0] = i;
    const c1 = s1.charCodeAt(i - 1);
    for (let j = 1; j <= n; j++) {
      if (c1 === s2.charCodeAt(j - 1)) {
        currRow[j] = prevRow[j - 1];
      } else {
        const del = prevRow[j] + 1;
        const ins = currRow[j - 1] + 1;
        const sub = prevRow[j - 1] + 1;
        currRow[j] = Math.min(del, ins, sub);
      }
    }
    const temp = prevRow;
    prevRow = currRow;
    currRow = temp;
  }
  return prevRow[n];
}

// Helper: Tokenize words
function tokenize(text) {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 0)
  );
}

// Helper: Jaccard word similarity
function jaccardSimilarity(set1, set2) {
  if (set1.size === 0 && set2.size === 0) return 1.0;
  let intersection = 0;
  for (const item of set1) {
    if (set2.has(item)) intersection++;
  }
  const union = set1.size + set2.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// 2. Pairwise Similarity Check
// Condition: All pairs need to be at least 30% different => similarity <= 70% (0.70)
const MAX_ALLOWED_SIMILARITY = 0.60;
const similarPairs = [];
const topClosestPairs = [];

const tokenizedPrompts = prompts.map((p) => tokenize(p));
const normalizedPrompts = prompts.map((p) => p.trim().toLowerCase());

let pairCount = 0;

for (let i = 0; i < prompts.length; i++) {
  const p1 = prompts[i];
  const n1 = normalizedPrompts[i];
  const t1 = tokenizedPrompts[i];

  for (let j = i + 1; j < prompts.length; j++) {
    pairCount++;
    const p2 = prompts[j];
    const n2 = normalizedPrompts[j];
    const t2 = tokenizedPrompts[j];

    const jaccardSim = jaccardSimilarity(t1, t2);

    const maxLen = Math.max(n1.length, n2.length);
    let levSim = 0;
    if (maxLen > 0) {
      // If length difference alone makes it impossible to exceed similarity, skip or bound
      const lenDiff = Math.abs(n1.length - n2.length);
      const minPossibleDist = lenDiff;
      const maxPossibleLevSim = 1 - minPossibleDist / maxLen;
      if (maxPossibleLevSim > 0.5) {
        const levDist = levenshteinDistance(n1, n2);
        levSim = 1 - levDist / maxLen;
      }
    }

    const maxSim = Math.max(levSim, jaccardSim);
    const difference = 1 - maxSim;

    const record = {
      index1: i + 1,
      index2: j + 1,
      prompt1: p1,
      prompt2: p2,
      similarity: maxSim,
      difference: difference,
      levSim,
      jaccardSim,
    };

    if (maxSim > MAX_ALLOWED_SIMILARITY) {
      similarPairs.push(record);
    }

    // Keep track of top 5 closest
    if (topClosestPairs.length < 5) {
      topClosestPairs.push(record);
      topClosestPairs.sort((a, b) => b.similarity - a.similarity);
    } else if (maxSim > topClosestPairs[topClosestPairs.length - 1].similarity) {
      topClosestPairs[topClosestPairs.length - 1] = record;
      topClosestPairs.sort((a, b) => b.similarity - a.similarity);
    }
  }
}

similarPairs.sort((a, b) => b.similarity - a.similarity);

console.log(`Evaluated ${pairCount.toLocaleString()} prompt pairs.\n`);

if (similarPairs.length > 0) {
  console.log(
    `❌ Found ${similarPairs.length} pair(s) with > ${(MAX_ALLOWED_SIMILARITY * 100).toFixed(0)}% similarity (less than 30% different):\n`
  );
  similarPairs.forEach((pair, idx) => {
    console.log(
      `  ${idx + 1}. [${(pair.similarity * 100).toFixed(1)}% similar / ${(pair.difference * 100).toFixed(1)}% different]`
    );
    console.log(`     [#${pair.index1}] "${pair.prompt1}"`);
    console.log(`     [#${pair.index2}] "${pair.prompt2}"`);
    console.log(`     (Levenshtein: ${(pair.levSim * 100).toFixed(1)}%, Word Overlap: ${(pair.jaccardSim * 100).toFixed(1)}%)\n`);
  });
} else {
  console.log(
    `✅ All prompt pairs are at least 30% different (max similarity <= ${(MAX_ALLOWED_SIMILARITY * 100).toFixed(0)}%).`
  );
}

// Display top 5 closest pairs for visibility
console.log(`\n📊 Top 5 Closest Pairs across all prompts:`);
topClosestPairs.forEach((pair, idx) => {
  console.log(
    `  ${idx + 1}. [${(pair.similarity * 100).toFixed(1)}% similar / ${(pair.difference * 100).toFixed(1)}% different] (Lev: ${(pair.levSim * 100).toFixed(0)}%, Word: ${(pair.jaccardSim * 100).toFixed(0)}%)`
  );
  console.log(`     - [#${pair.index1}] "${pair.prompt1}"`);
  console.log(`     - [#${pair.index2}] "${pair.prompt2}"`);
});
console.log();

if (exactDuplicates.length > 0 || similarPairs.length > 0) {
  console.log(`❌ Check FAILED: Please resolve duplicate and overly similar prompts.`);
  process.exit(1);
} else {
  console.log(`🎉 All checks PASSED successfully!`);
  process.exit(0);
}
