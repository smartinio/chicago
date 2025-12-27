export const displayErrors = (error: any, handlers: Record<string, (arg: any) => void>) => {
  try {
    const errors = JSON.parse(error.message)
    for (const err of errors) {
      const handlerEntries = Object.entries(handlers)
      for (const [path, errorSetter] of handlerEntries) {
        if (err.path && err.path[0] === path) {
          errorSetter(err.message)
        }
      }
    }
  } catch {}
}
