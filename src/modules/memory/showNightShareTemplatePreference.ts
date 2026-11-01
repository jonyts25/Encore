import 'expo-sqlite/localStorage/install';

import type { ShowNightShareTemplateId } from './showNightShareCardLogic';

const STORAGE_KEY = 'encore.showNightShare.lastTemplate';

const VALID: ShowNightShareTemplateId[] = ['boleto', 'setlist', 'poster'];

export function readLastShowNightShareTemplate(): ShowNightShareTemplateId | null {
  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    if (VALID.includes(raw as ShowNightShareTemplateId)) {
      return raw as ShowNightShareTemplateId;
    }
    return null;
  } catch {
    return null;
  }
}

export function writeLastShowNightShareTemplate(template: ShowNightShareTemplateId): void {
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, template);
  } catch {
    // ignore
  }
}
