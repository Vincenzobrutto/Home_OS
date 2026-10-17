/** Only local room/object routes in this account and home can supply a back link. */
export function contextReturn(state: unknown, accountId: string, homeId: string) {
  const value = state as {accountId?: unknown; returnTo?: {path?: unknown; label?: unknown}} | null;
  if (value?.accountId !== accountId || typeof value.returnTo?.path !== 'string' || typeof value.returnTo.label !== 'string') return null;
  const prefix = `/home/${encodeURIComponent(homeId)}/`;
  if (!value.returnTo.path.startsWith(prefix) || !/^(ambienti|oggetti\/(object|boiler))\/[A-Za-z0-9_-]+$/.test(value.returnTo.path.slice(prefix.length))) return null;
  const label = value.returnTo.label.trim().slice(0, 120);
  return label ? {path: value.returnTo.path, label} : null;
}
