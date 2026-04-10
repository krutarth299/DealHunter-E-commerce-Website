import { useSyncExternalStore } from 'react';

let hasHydratedSnapshot = false;
const listeners = new Set();

const notifyHydrated = () => {
  if (hasHydratedSnapshot) return;
  hasHydratedSnapshot = true;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener) => {
  listeners.add(listener);

  if (!hasHydratedSnapshot) {
    queueMicrotask(notifyHydrated);
  }

  return () => listeners.delete(listener);
};

const getSnapshot = () => hasHydratedSnapshot;
const getServerSnapshot = () => false;

const useHasHydrated = () =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

export default useHasHydrated;
