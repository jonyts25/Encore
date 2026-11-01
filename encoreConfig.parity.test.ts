import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import * as serverConfig from './server/lib/encoreConfig';
import * as sharedConfig from './shared/encoreConfig';

const SYNCED_CONSTANTS = [
  'APP_NAME',
  'PRIVACY_CONTACT_EMAIL',
  'PUBLIC_SERVER_BASE_URL',
  'PRIVACY_NOTICE_LAST_UPDATED',
] as const;

describe('encoreConfig parity (shared vs server)', () => {
  it('keeps the same exported constants', () => {
    for (const key of SYNCED_CONSTANTS) {
      assert.equal(
        sharedConfig[key],
        serverConfig[key],
        `${key} must match between shared/encoreConfig.ts and server/lib/encoreConfig.ts`
      );
    }
  });

  it('keeps the same URL helpers', () => {
    for (const locale of ['es', 'en'] as const) {
      assert.equal(sharedConfig.privacyNoticePath(locale), serverConfig.privacyNoticePath(locale));
      assert.equal(sharedConfig.privacyNoticeUrl(locale), serverConfig.privacyNoticeUrl(locale));
    }
  });

  it('keeps the same default contact email', () => {
    const prev = process.env.PRIVACY_CONTACT_EMAIL;
    delete process.env.PRIVACY_CONTACT_EMAIL;
    try {
      assert.equal(sharedConfig.privacyContactEmail(), serverConfig.privacyContactEmail());
    } finally {
      if (prev === undefined) delete process.env.PRIVACY_CONTACT_EMAIL;
      else process.env.PRIVACY_CONTACT_EMAIL = prev;
    }
  });
});
