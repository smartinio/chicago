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
