import { AsyncIteratorResult, IAsyncPool } from './types'

export const pool = <T> (): IAsyncPool<T> => {
  const data: AsyncIteratorResult<T>[] = []
  let onData: (() => void) | undefined
  let pullPromise: AsyncIteratorResult<T> | undefined
  const doResolve = (res: any) => {
    onData = pullPromise = undefined
    res(data.shift())
  }

  return {
    push (value: AsyncIteratorResult<T>) {
      data.push(value)
      onData && onData()

      return Promise.resolve(true)
    },
    pull (): AsyncIteratorResult<T> {
      return pullPromise ||
        (data.length > 0 && data.shift()) ||
        (pullPromise = new Promise((res) => {
          data.length > 0
            ? doResolve(res)
            : onData = () => doResolve(res)
        }))
    },
  }
}
