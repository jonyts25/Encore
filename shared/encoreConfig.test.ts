import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { privacyNoticeUrl } from './encoreConfig';

describe('encoreConfig', () => {
  it('builds localized privacy URLs on the public server host', () => {
    assert.equal(
      privacyNoticeUrl('es'),
      'https://encore-api-production-5b9a.up.railway.app/privacidad'
    );
    assert.equal(
      privacyNoticeUrl('en'),
      'https://encore-api-production-5b9a.up.railway.app/privacy'
    );
  });
});
