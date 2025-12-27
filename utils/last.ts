export const last = <T>(list: T[]) => {
  return list.length === 0 ? undefined : list[list.length - 1]
}
