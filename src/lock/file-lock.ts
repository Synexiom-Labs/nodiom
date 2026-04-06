import lockfile from 'proper-lockfile';
import { LockError } from '../errors.js';

export interface LockHandle {
  release: () => Promise<void>;
}

/**
 * Acquires an advisory lock on the given file path.
 * Throws LockError if the lock cannot be acquired within the timeout.
 */
export async function acquireLock(filePath: string, timeoutMs: number): Promise<LockHandle> {
  try {
    const release = await lockfile.lock(filePath, {
      retries: {
        retries: Math.ceil(timeoutMs / 100),
        minTimeout: 100,
        maxTimeout: 100,
      },
      stale: 10000,
    });
    return { release };
  } catch (err) {
    throw new LockError(
      filePath,
      err instanceof Error ? err.message : 'could not acquire lock',
    );
  }
}

/**
 * Releases a previously acquired lock.
 */
export async function releaseLock(handle: LockHandle, filePath: string): Promise<void> {
  try {
    await handle.release();
  } catch (err) {
    throw new LockError(
      filePath,
      err instanceof Error ? err.message : 'could not release lock',
    );
  }
}
