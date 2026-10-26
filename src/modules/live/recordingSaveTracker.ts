const SAVE_WAIT_TIMEOUT_MS = 180_000;

let resolvePendingSave: (() => void) | null = null;
let saveWaitTimeoutId: ReturnType<typeof setTimeout> | null = null;

function clearSaveWaitTimeout(): void {
  if (saveWaitTimeoutId !== null) {
    clearTimeout(saveWaitTimeoutId);
    saveWaitTimeoutId = null;
  }
}

function resolvePendingSaveWaiter(): void {
  const pending = resolvePendingSave;
  resolvePendingSave = null;
  pending?.();
}

export function waitForRecordingSave(): Promise<void> {
  return new Promise((resolve) => {
    clearSaveWaitTimeout();
    resolvePendingSave = resolve;
    saveWaitTimeoutId = setTimeout(() => {
      saveWaitTimeoutId = null;
      resolvePendingSaveWaiter();
    }, SAVE_WAIT_TIMEOUT_MS);
  });
}

export function notifyRecordingSaveFinished(): void {
  clearSaveWaitTimeout();
  resolvePendingSaveWaiter();
}
