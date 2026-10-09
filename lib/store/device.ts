import { useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

/**
 * A value that only the device can know (is this the native app, can its store sell Pro),
 * read without a mismatch between the server's render and the phone's: the server renders
 * `server`, the phone renders `read()`. `read` must return a primitive (compared with ===).
 */
export function useOnDevice<T extends string | number | boolean>(read: () => T, server: T): T {
  return useSyncExternalStore(noSubscribe, read, () => server);
}
