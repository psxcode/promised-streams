import { AsyncIteratorResult, IAsyncPool } from './types'

const pool = <T> (): IAsyncPool<T> => {
  const data: AsyncIteratorResult<T>[] = []
  let onData: (() => void) | undefined
  let pullPromise: AsyncIteratorResult<T> | undefined
  const doResolve = (res: any) => {
    onData = pullPromise = undefined
    res(data.shift())
  }

  return {
    async push (value: AsyncIteratorResult<T>) {
      data.push(value)
      onData && onData()
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

export default pool
