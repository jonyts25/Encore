import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_MANUAL_LINE_INTERVAL_SECONDS,
  detectScrollMode,
  elapsedSecondsForLineIndex,
  resolveActiveLineIndex,
} from './scrollLogic';

test('detectScrollMode prefers synced lines', () => {
  assert.equal(
    detectScrollMode([{ line: 'hello', timestamp_seconds: 0 }], 180),
    'synced'
  );
});

test('detectScrollMode uses estimated when duration exists without sync', () => {
  assert.equal(detectScrollMode([], 180), 'estimated');
});

test('detectScrollMode falls back to manual', () => {
  assert.equal(detectScrollMode([], null), 'manual');
});

test('elapsedSecondsForLineIndex and resolveActiveLineIndex are inverse in manual mode', () => {
  const displayLines = ['a', 'b', 'c', 'd'];
  const targetIndex = 2;
  const elapsed = elapsedSecondsForLineIndex(
    'manual',
    targetIndex,
    displayLines,
    [],
    null,
    DEFAULT_MANUAL_LINE_INTERVAL_SECONDS
  );

  const resolved = resolveActiveLineIndex(
    'manual',
    elapsed,
    displayLines,
    [],
    null,
    DEFAULT_MANUAL_LINE_INTERVAL_SECONDS
  );

  assert.equal(resolved, targetIndex);
});

test('step forward uses synced timestamps', () => {
  const synced = [
    { line: 'one', timestamp_seconds: 0 },
    { line: 'two', timestamp_seconds: 10 },
    { line: 'three', timestamp_seconds: 25 },
  ];
  const displayLines = synced.map((entry) => entry.line);

  assert.equal(
    resolveActiveLineIndex('synced', 10, displayLines, synced, null),
    1
  );
  assert.equal(elapsedSecondsForLineIndex('synced', 2, displayLines, synced, null), 25);
});
