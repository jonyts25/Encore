/**
 * Bootstrap crash diagnostics.
 * Uses console.warn so markers are more likely to appear in iOS unified logs
 * (Console.app / pymobiledevice3 syslog) than console.log in release builds.
 */
export function bootLog(message: string): void {
  console.warn(message);
}
