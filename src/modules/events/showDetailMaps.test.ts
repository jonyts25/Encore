import assert from 'node:assert/strict';
import test from 'node:test';

import { buildAppleMapsUrl } from './showDetailMaps';

test('buildAppleMapsUrl uses coordinates when present', () => {
  const url = buildAppleMapsUrl({
    name: 'Arena CDMX',
    city: 'Ciudad de México',
    lat: 19.3029,
    lng: -99.0989,
  });
  assert.match(url, /^maps:\/\/\?q=/);
  assert.match(url, /ll=19\.3029,-99\.0989/);
});

test('buildAppleMapsUrl falls back to name search without coordinates', () => {
  const url = buildAppleMapsUrl({
    name: 'Palacio de los Deportes',
    city: 'CDMX',
    lat: null,
    lng: null,
  });
  assert.equal(url, 'maps://?q=Palacio%20de%20los%20Deportes%2C%20CDMX');
});
