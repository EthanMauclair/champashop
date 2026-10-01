import { getCurrentScope, onScopeDispose } from 'vue'

export interface DebouncedCallback<Args extends unknown[]> {
  /** Relance le minuteur : `callback` ne part qu'après `delayMs` sans nouvel appel. */
  run: (...args: Args) => void
  /** Annule l'appel en attente. */
  cancel: () => void
}

/**
 * Retarde un appel jusqu'à ce que l'utilisateur arrête d'agir pendant
 * `delayMs` (ex. : 300 ms pour la recherche). Le minuteur est annulé
 * automatiquement quand le composant est démonté.
 */
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number,
): DebouncedCallback<Args> {
  let timer: ReturnType<typeof setTimeout> | undefined

  function cancel(): void {
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }
  }

  function run(...args: Args): void {
    cancel()
    timer = setTimeout(() => {
      timer = undefined
      callback(...args)
    }, delayMs)
  }

  if (getCurrentScope()) {
    onScopeDispose(cancel)
  }

  return { run, cancel }
}
