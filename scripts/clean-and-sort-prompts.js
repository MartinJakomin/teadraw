import { readFileSync, writeFileSync } from "fs";
import { resolve, join } from "path";

const rootDir = resolve(".");
const promptsPath = join(rootDir, "server/src/prompts.ts");

const fileContent = readFileSync(promptsPath, "utf-8");

// Extract PROMPTS array block from server/src/prompts.ts
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

// Extract all string literals from the PROMPTS array block
const regex = /(["'])(?:(?=(\\?))\2[\s\S])*?\1/g;
const rawPrompts = [];
let match;
while ((match = regex.exec(promptsBlock)) !== null) {
  let str = match[0].slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, "'").trim();
  // Strip trailing period if not ellipsis
  if (str.endsWith(".") && !str.endsWith("...")) {
    str = str.slice(0, -1).trim();
  }
  if (str.length > 0) {
    rawPrompts.push(str);
  }
}

console.log(`\n======================================================`);
console.log(`🧹 Cleaning, Sorting & Deduplicating PROMPTS`);
console.log(`======================================================`);
console.log(`Found ${rawPrompts.length} total prompt entries in server/src/prompts.ts.`);

// 1. Remove exact duplicates (case-insensitive & trimmed)
const seenExact = new Map();
const uniquePrompts = [];
let exactDupes = 0;

for (const prompt of rawPrompts) {
  const norm = prompt.toLowerCase();
  if (seenExact.has(norm)) {
    exactDupes++;
  } else {
    seenExact.set(norm, prompt);
    uniquePrompts.push(prompt);
  }
}

console.log(`• Removed ${exactDupes} exact duplicate(s). (${uniquePrompts.length} unique prompts)`);

// 2. Sort alphabetically (A-Z, case-insensitive)
uniquePrompts.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
console.log(`• Sorted ${uniquePrompts.length} prompts alphabetically from A to Z.`);

// Helper: Levenshtein distance
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

function tokenize(text) {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 0)
  );
}

function jaccardSimilarity(set1, set2) {
  if (set1.size === 0 && set2.size === 0) return 1.0;
  let intersection = 0;
  for (const item of set1) {
    if (set2.has(item)) intersection++;
  }
  const union = set1.size + set2.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// 3. Similarity check: Keep the first prompt, delete any subsequent similar prompt (>70% similar / <30% different)
const MAX_ALLOWED_SIMILARITY = 0.60;
const finalPrompts = [];
const finalNorms = [];
const finalTokens = [];
const removedSimilar = [];

for (const candidate of uniquePrompts) {
  const norm = candidate.toLowerCase();
  const tokens = tokenize(candidate);

  let conflict = null;

  for (let i = 0; i < finalPrompts.length; i++) {
    const kept = finalPrompts[i];
    const keptNorm = finalNorms[i];
    const keptTokens = finalTokens[i];

    // Word Jaccard similarity
    const jaccSim = jaccardSimilarity(tokens, keptTokens);
    if (jaccSim > MAX_ALLOWED_SIMILARITY) {
      conflict = {
        kept,
        reason: `Word Overlap ${(jaccSim * 100).toFixed(1)}%`,
        similarity: jaccSim,
      };
      break;
    }

    // Levenshtein character similarity
    const maxLen = Math.max(norm.length, keptNorm.length);
    if (maxLen > 0) {
      const lenDiff = Math.abs(norm.length - keptNorm.length);
      const maxPossibleLevSim = 1 - lenDiff / maxLen;
      if (maxPossibleLevSim > MAX_ALLOWED_SIMILARITY) {
        const levDist = levenshteinDistance(norm, keptNorm);
        const levSim = 1 - levDist / maxLen;
        if (levSim > MAX_ALLOWED_SIMILARITY) {
          conflict = {
            kept,
            reason: `Levenshtein ${(levSim * 100).toFixed(1)}%`,
            similarity: levSim,
          };
          break;
        }
      }
    }
  }

  if (conflict) {
    removedSimilar.push({
      removed: candidate,
      kept: conflict.kept,
      reason: conflict.reason,
      similarity: conflict.similarity,
    });
  } else {
    finalPrompts.push(candidate);
    finalNorms.push(norm);
    finalTokens.push(tokens);
  }
}

console.log(`• Removed ${removedSimilar.length} overly similar prompt(s) (kept the first instance of each).`);
console.log(`\n🎉 Final Clean Prompts Count: ${finalPrompts.length}`);

// Write back to server/src/prompts.ts
const formattedList = finalPrompts.map((p) => `  ${JSON.stringify(p)}`).join(",\n");
const newContent =
  fileContent.substring(0, startIndex + startMarker.length) +
  "\n" +
  formattedList +
  "\n" +
  fileContent.substring(endIndex);

writeFileSync(promptsPath, newContent, "utf-8");
console.log(`\n✅ Successfully updated ${promptsPath}!\n`);

if (removedSimilar.length > 0) {
  console.log(`Sample of removed similar prompts:`);
  removedSimilar.slice(0, 10).forEach((item, idx) => {
    console.log(`  ${idx + 1}. Removed: "${item.removed}" (Kept: "${item.kept}" — ${item.reason})`);
  });
  if (removedSimilar.length > 10) {
    console.log(`  ... and ${removedSimilar.length - 10} more.`);
  }
  console.log();
}
