import 'expo-sqlite/localStorage/install';

const STORAGE_KEY = 'encore.explore.selectedCity';

export function readExploreCityPreference(): string | null {
  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}

export function writeExploreCityPreference(city: string | null): void {
  try {
    if (!city?.trim()) {
      globalThis.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    globalThis.localStorage.setItem(STORAGE_KEY, city.trim());
  } catch {
    // ignore storage failures
  }
}
