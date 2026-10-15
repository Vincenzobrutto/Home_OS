import { useEffect, useRef } from 'react';

/** Restore focus after an in-place update removes the control that held it. */
export function useUpdateFocus<T extends HTMLElement>(resource: string, version: number | undefined) {
  const target = useRef<T>(null);
  const previous = useRef({ resource, version });
  useEffect(() => {
    const before = previous.current;
    previous.current = { resource, version };
    if (before.resource === resource && before.version !== undefined && version !== undefined && before.version !== version && document.activeElement === document.body) {
      target.current?.focus();
    }
  }, [resource, version]);
  return target;
}
