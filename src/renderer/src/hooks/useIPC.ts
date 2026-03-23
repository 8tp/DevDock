import { useEffect } from 'react'

type CleanupFn = () => void
type Subscriber<T = unknown> = (callback: (data: T) => void) => CleanupFn

/**
 * Subscribe to an IPC streaming event with automatic cleanup on unmount.
 *
 * The `subscribe` function is expected to register a listener on the
 * preload-exposed API and return a cleanup function that removes it.
 *
 * @example
 * ```tsx
 * useIPCEvent(window.api.onLogLine, (line) => {
 *   appendLog(line)
 * })
 * ```
 */
export function useIPCEvent<T = unknown>(
  subscribe: Subscriber<T>,
  handler: (data: T) => void
): void {
  useEffect(() => {
    const cleanup = subscribe(handler)
    return cleanup
  }, [subscribe, handler])
}
