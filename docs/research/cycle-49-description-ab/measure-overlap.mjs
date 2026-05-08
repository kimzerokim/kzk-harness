#!/usr/bin/env node
// measure-overlap.mjs — Pass C description keyword overlap proxy
// Compares old vs new skill descriptions by token overlap with prompt tokens.

import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PROMPTS_PATH = join(__dirname, 'prompts.json');
const OLD_DIR = join(__dirname, 'old-descriptions');
const NEW_DIR = join(__dirname, 'new-descriptions');
const OUT_PATH = join(__dirname, 'overlap-results.tsv');

// Load prompts
const promptsData = JSON.parse(readFileSync(PROMPTS_PATH, 'utf8'));
const allPrompts = [
  ...promptsData.canonical,
  ...promptsData.near_canonical,
  ...promptsData.cross_skill_binding,
  ...promptsData.non_canonical_paraphrase,
];

// Load all skill names
const skills = readdirSync(OLD_DIR)
  .filter(f => f.endsWith('.txt'))
  .map(f => f.replace('.txt', ''));

// Tokenize: split on whitespace, remove Korean particles/postpositions (trivial),
// drop tokens shorter than 2 chars, lowercase.
function tokenize(text) {
  return text
    .split(/[\s,./()[\]{}:;'"!?+=|<>~@#$%^&*]+/)
    .map(t => t.toLowerCase())
    .filter(t => t.length >= 2);
}

// Compute token overlap: count how many prompt tokens appear in description text
function overlapScore(promptTokens, descText) {
  const descLower = descText.toLowerCase();
  let count = 0;
  for (const tok of promptTokens) {
    if (descLower.includes(tok)) count++;
  }
  return count;
}

// Rank skills by overlap score, return top-N skill names
function rankSkills(promptTokens, descriptions) {
  const scores = skills.map(skill => ({
    skill,
    score: overlapScore(promptTokens, descriptions[skill] || ''),
  }));
  scores.sort((a, b) => b.score - a.score || a.skill.localeCompare(b.skill));
  return scores;
}

// Load description files
function loadDescriptions(dir) {
  const result = {};
  for (const skill of skills) {
    try {
      result[skill] = readFileSync(join(dir, skill + '.txt'), 'utf8').trim();
    } catch {
      result[skill] = '';
    }
  }
  return result;
}

const oldDescs = loadDescriptions(OLD_DIR);
const newDescs = loadDescriptions(NEW_DIR);

// Ranking shift codes:
// 0 = top-1 and expected all in top-3 (identical)
// 1 = top-1 shifted but expected still in top-3
// 2 = expected dropped from top-3 to top-5
// 3 = expected dropped out of top-5 entirely (DEGRADATION)
function computeShift(expectedList, oldRanked, newRanked) {
  let maxShift = 0;
  for (const exp of expectedList) {
    const oldPos = oldRanked.findIndex(r => r.skill === exp);  // 0-indexed
    const newPos = newRanked.findIndex(r => r.skill === exp);
    // Compute per-expected shift
    let shift = 0;
    if (newPos >= 5) {
      shift = 3; // dropped out of top-5
    } else if (newPos >= 3) {
      shift = 2; // dropped from top-3 to top-5
    } else if (newPos !== oldPos) {
      shift = 1; // top-1 shifted but expected still in top-3
    }
    if (shift > maxShift) maxShift = shift;
  }
  return maxShift;
}

// Output rows
const rows = [];
const header = 'prompt_id\tprompt\texpected\told_top3\tnew_top3\texpected_in_old_top5\texpected_in_new_top5\tranking_shift';
rows.push(header);

// Per-skill degradation tracking
const skillDegradationCount = {};
for (const skill of skills) skillDegradationCount[skill] = 0;

let degradationCount = 0;
let acceptableCount = 0;

const shiftResults = [];

for (const p of allPrompts) {
  const promptTokens = tokenize(p.prompt);
  const oldRanked = rankSkills(promptTokens, oldDescs);
  const newRanked = rankSkills(promptTokens, newDescs);

  const oldTop3 = oldRanked.slice(0, 3).map(r => r.skill).join(',');
  const newTop3 = newRanked.slice(0, 3).map(r => r.skill).join(',');

  const oldTop5Skills = new Set(oldRanked.slice(0, 5).map(r => r.skill));
  const newTop5Skills = new Set(newRanked.slice(0, 5).map(r => r.skill));

  const expectedInOldTop5 = p.expected.filter(e => oldTop5Skills.has(e)).join(',') || 'none';
  const expectedInNewTop5 = p.expected.filter(e => newTop5Skills.has(e)).join(',') || 'none';

  const shift = computeShift(p.expected, oldRanked, newRanked);
  shiftResults.push({ ...p, shift, oldRanked, newRanked, oldTop3, newTop3 });

  if (shift >= 3) {
    degradationCount++;
    // Track per-skill
    for (const exp of p.expected) {
      const newPos = newRanked.findIndex(r => r.skill === exp);
      if (newPos >= 5) skillDegradationCount[exp]++;
    }
  }
  if (shift <= 1) acceptableCount++;

  rows.push([
    p.id,
    p.prompt,
    p.expected.join(','),
    oldTop3,
    newTop3,
    expectedInOldTop5,
    expectedInNewTop5,
    shift,
  ].join('\t'));
}

writeFileSync(OUT_PATH, rows.join('\n') + '\n', 'utf8');

// Summary metrics to stdout
console.log('\n=== Pass C Summary ===');
console.log(`Total prompts: ${allPrompts.length}`);
console.log(`Degradation (shift>=3): ${degradationCount}/${allPrompts.length} (${Math.round(degradationCount/allPrompts.length*100)}%)`);
console.log(`Acceptable (shift<=1): ${acceptableCount}/${allPrompts.length} (${Math.round(acceptableCount/allPrompts.length*100)}%)`);

console.log('\nPer-skill degradation (expected but ranked outside top-5 in NEW):');
const skillsByDeg = Object.entries(skillDegradationCount)
  .filter(([,c]) => c > 0)
  .sort((a,b) => b[1]-a[1]);
if (skillsByDeg.length === 0) {
  console.log('  (none)');
} else {
  for (const [skill, count] of skillsByDeg) {
    console.log(`  ${skill}: ${count} prompts`);
  }
}

// Identify top-5 most-shifted prompts (for Pass D)
const top5Shifted = [...shiftResults]
  .sort((a,b) => b.shift - a.shift || a.id.localeCompare(b.id))
  .slice(0, 5);

console.log('\nTop-5 most-shifted prompts (for Pass D):');
for (const r of top5Shifted) {
  console.log(`  ${r.id} (shift=${r.shift}): "${r.prompt}" expected=[${r.expected.join(',')}]`);
  console.log(`    old_top3=[${r.oldTop3}] new_top3=[${r.newTop3}]`);
}

// Export top5 for Pass D
writeFileSync(
  join(__dirname, 'top5-shifted.json'),
  JSON.stringify(top5Shifted.map(r => ({
    id: r.id,
    prompt: r.prompt,
    expected: r.expected,
    shift: r.shift,
    old_top3: r.oldTop3,
    new_top3: r.newTop3,
    old_desc_for_expected: r.expected.map(e => ({ skill: e, desc: oldDescs[e] || '' })),
    new_desc_for_expected: r.expected.map(e => ({ skill: e, desc: newDescs[e] || '' })),
  })), null, 2),
  'utf8'
);

console.log('\noverlap-results.tsv written to:', OUT_PATH);
