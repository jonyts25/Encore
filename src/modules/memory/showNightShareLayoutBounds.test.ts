import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { availableShowNightShareTemplates } from './showNightShareCardLogic';
import {
  assertTemplateLayoutsWithinCanvas,
  buildStressShowNightShareCardModel,
  estimateTemplateLayoutRects,
} from './showNightShareLayoutMetrics';
import { SHARE_CARD_HEIGHT, SHARE_CARD_WIDTH } from './showNightShareCardLogic';
import { assertRectWithinCanvas } from './showNightShareSafeZones';

describe('showNightShareLayoutBounds', () => {
  const stress = buildStressShowNightShareCardModel();

  for (const template of availableShowNightShareTemplates(stress)) {
    it(`stress layout for ${template} stays within ${SHARE_CARD_WIDTH}x${SHARE_CARD_HEIGHT}`, () => {
      assertTemplateLayoutsWithinCanvas(template, stress);
    });
  }

  it('simulates onLayout probes aggregated for setlist stress model', () => {
    const probes: Array<{ id: string; rect: ReturnType<typeof estimateTemplateLayoutRects>[number] }> = [];
    const onProbe = (id: string, rect: (typeof probes)[number]['rect']) => {
      probes.push({ id, rect });
    };

    for (const rect of estimateTemplateLayoutRects('setlist', stress)) {
      onProbe(`setlist-${probes.length}`, rect);
    }

    assert.ok(probes.length > 0);
    for (const { rect } of probes) {
      assertRectWithinCanvas(rect, { x: 0, y: 0, width: SHARE_CARD_WIDTH, height: SHARE_CARD_HEIGHT });
    }
  });
});
