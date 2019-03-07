import { AsyncIteratorResult, IPool } from './types'

const pool = <T> (): IPool<T> => {
  const data: AsyncIteratorResult<T>[] = []
  let onData: (() => void) | undefined
  let pullPromise: AsyncIteratorResult<T> | undefined
  const doResolve = (res: any) => {
    onData = pullPromise = undefined
    res(data.shift())
  }

  return {
    async push (result) {
      data.push(result)
      onData && onData()
    },
    pull () {
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
