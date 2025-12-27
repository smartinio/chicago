import { ChangeEventHandler, useCallback, useRef } from 'react'

export const useTextInput = (callback: (value: string) => void, clearError?: (...args: any[]) => void) => {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  const eventHandler = useCallback<ChangeEventHandler<HTMLInputElement>>((event) => {
    callbackRef.current(event.target.value)
    clearError?.()
  }, [clearError])

  return eventHandler
}
