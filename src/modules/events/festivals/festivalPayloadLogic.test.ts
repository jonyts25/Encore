import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildFestivalValidationSummary,
  parseFestivalImportJson,
  uniqueArtistNames,
} from './festivalPayloadLogic';

const SAMPLE = `{
  "name": "Corona Capital",
  "edition_year": 2027,
  "venue": { "name": "Autódromo", "city": "CDMX" },
  "start_date": "2027-11-19",
  "end_date": "2027-11-21",
  "lineup": [
    { "artist": "Khruangbin", "day": "2027-11-19", "stage": "Principal", "start": "21:00", "end": null },
    { "artist": "Unknown Act", "day": "2027-11-20", "stage": null, "start": null, "end": null }
  ]
}`;

describe('festivalPayloadLogic', () => {
  it('parses and normalizes festival JSON', () => {
    const payload = parseFestivalImportJson(SAMPLE);
    assert.equal(payload.name, 'Corona Capital');
    assert.equal(uniqueArtistNames(payload).length, 2);
  });

  it('summarizes found vs missing artists', () => {
    const payload = parseFestivalImportJson(SAMPLE);
    const summary = buildFestivalValidationSummary(payload, {
      Khruangbin: true,
      'Unknown Act': false,
    });
    assert.equal(summary.foundArtists.length, 1);
    assert.equal(summary.missingArtists.length, 1);
    assert.equal(summary.lineupCount, 2);
  });
});
