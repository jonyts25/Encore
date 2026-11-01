import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { pickPreferredUserShowStatus } from './show-merge-logic';

describe('pickPreferredUserShowStatus', () => {
  it('keeps fui over voy and rating-related status', () => {
    assert.equal(pickPreferredUserShowStatus('fui', 'voy'), 'fui');
    assert.equal(pickPreferredUserShowStatus('voy', 'fui'), 'fui');
    assert.equal(pickPreferredUserShowStatus('interesado', 'voy'), 'voy');
  });
});
