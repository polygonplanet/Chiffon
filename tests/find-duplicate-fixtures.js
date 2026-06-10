// Scans tests/fixtures for test-NNNN.js files whose contents are identical
// and prints groups of duplicates.
//
// Usage:
//   node tests/find-duplicate-fixtures.js
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const FIXTURES_DIR = path.resolve(__dirname, 'fixtures');

function scanTestFiles(dir, isRecursive = false) {
  const results = [];

  for (const fileName of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, fileName);

    if (isRecursive) {
      if (fs.statSync(fullPath).isDirectory()) {
        results.push(...scanTestFiles(fullPath, true));
      } else if (/^test-\d+\.js$/.test(fileName)) {
        results.push(fullPath);
      }
    } else {
      if (/^test-\d+\.js$/.test(fileName)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

const sha1 = (s) => crypto.createHash('sha1').update(s).digest('hex');
const relPath = (p) => path.relative(FIXTURES_DIR, p).replace(/\\/g, '/') || '.';
const normalizeLineBreaks = (content) => content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

const indent = (text, prefix) =>
  text
    .split('\n')
    .map((line) => prefix + line)
    .join('\n');

function preview(content, maxLines) {
  const lines = content.split('\n');
  if (lines.length <= maxLines) {
    return content;
  }
  return `${lines.slice(0, maxLines).join('\n')}\n... (${lines.length - maxLines} more line(s))`;
}

function run() {
  const files = scanTestFiles(FIXTURES_DIR);
  const groups = new Map();

  for (const file of files) {
    const normalized = normalizeLineBreaks(fs.readFileSync(file, 'utf8'));
    const key = sha1(normalized);
    if (!groups.has(key)) {
      groups.set(key, { content: normalized, files: [] });
    }
    groups.get(key).files.push(file);
  }

  const duplicates = [...groups.values()]
    .filter((g) => g.files.length >= 2)
    .sort((a, b) => b.files.length - a.files.length || a.content.length - b.content.length);

  console.log(`Scanned: ${files.length} fixture file(s) under tests/fixtures/`);

  if (duplicates.length === 0) {
    console.log('No duplicate fixtures found.');
    return;
  }

  const totalDupFiles = duplicates.reduce((sum, g) => sum + g.files.length, 0);
  console.log(`Duplicate groups: ${duplicates.length}  (involving ${totalDupFiles} files)`);
  console.log('');

  duplicates.forEach((group, j) => {
    group.files.sort();
    // console.log(`--- Group ${j + 1} (${group.files.length} files, ${group.content.length} chars) ---`);
    // for (const file of group.files) {
    //   console.log(`  ${relPath(file)}`);
    // }
    // console.log('  Content:');
    // console.log(indent(preview(group.content, 8), '    '));
    // console.log('');

    console.log(`--- Group ${j + 1} (${group.files.length} files, ${group.content.length} chars) ---`);
    for (const file of group.files) {
      console.log(`* ${relPath(file)}`);
    }
    // console.log(group.files.map(relPath).join(' and ') + ' are duplicates.');
  });
}

run();
