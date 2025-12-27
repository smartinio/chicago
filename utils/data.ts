import { isError, Errors } from 'game/types'
import { setError, setResult } from 'store'

export const dataHandler =
  <T>(onData: (data: T) => void, onError: (error?: Errors) => void) =>
  (data: T | Errors) => {
    if (isError(data)) {
      onError(data)
    } else {
      onData(data)
      onError()
    }
  }

export const defaultDataHandler = dataHandler(setResult, setError)
