import { useEffect, useState } from "react"

export const usePersistedState = (key: string, initialValue = '') => {
  const [state, setState] = useState(initialValue)

  useEffect(() => {
    const persistedState = localStorage.getItem(key)
    if (persistedState) {
      setState(persistedState)
    }
  }, [key])

  useEffect(() => {
    if (state) {
      localStorage.setItem(key, state)
    }
  }, [key, state])

  return [state, setState] as const
}

export const usePersistedObjectState = <T>(key: string, initialValue: T) => {
  const [state, setState] = useState<T>(initialValue)

  useEffect(() => {
    const persistedState = localStorage.getItem(key)
    if (persistedState) {
      try {
        setState({ ...initialValue, ...JSON.parse(persistedState) })
      } catch {
        // ignore invalid JSON
      }
    }
  }, [key])

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state))
  }, [key, state])

  return [state, setState] as const
}
