import assert from 'node:assert/strict';
import test from 'node:test';

import {
  __resetShowPackPrefetchLocksForTests,
  getShowPackPrefetchInFlight,
  withShowPackPrefetchLock,
} from './showPackLock';

test('withShowPackPrefetchLock runs only one task per show at a time', async () => {
  __resetShowPackPrefetchLocksForTests();
  let active = 0;
  let maxActive = 0;

  const task = async () => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    await new Promise((resolve) => setTimeout(resolve, 40));
    active -= 1;
  };

  await Promise.all([
    withShowPackPrefetchLock('show-a', task),
    withShowPackPrefetchLock('show-a', task),
    withShowPackPrefetchLock('show-a', task),
  ]);

  assert.equal(maxActive, 1);
});

test('withShowPackPrefetchLock allows parallel work for different shows', async () => {
  __resetShowPackPrefetchLocksForTests();
  let active = 0;
  let maxActive = 0;

  const task = async () => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    await new Promise((resolve) => setTimeout(resolve, 40));
    active -= 1;
  };

  await Promise.all([
    withShowPackPrefetchLock('show-a', task),
    withShowPackPrefetchLock('show-b', task),
  ]);

  assert.equal(maxActive, 2);
});

test('getShowPackPrefetchInFlight exposes the in-flight promise', async () => {
  __resetShowPackPrefetchLocksForTests();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });

  const running = withShowPackPrefetchLock('show-a', async () => {
    await gate;
  });

  const inFlight = getShowPackPrefetchInFlight('show-a');
  assert.ok(inFlight);

  release();
  await running;
  assert.equal(getShowPackPrefetchInFlight('show-a'), undefined);
});
