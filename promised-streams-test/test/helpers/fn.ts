export const fn = <A extends unknown[] = unknown[]>(log?: (...args: A) => unknown) => {
  const calls: A[] = []
  const spy = (...args: A): void => {
    calls.push(args)
    log?.(...args)
  }

  return Object.assign(spy, { calls })
}
