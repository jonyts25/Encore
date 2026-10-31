/** Full-screen loaders: only when the query has never produced data. */
export function isQueryInitialLoad(isPending: boolean, data: unknown): boolean {
  return isPending && data === undefined;
}
