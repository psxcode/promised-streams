import { subscribeAsync } from './internal.ts'
import type { PullProducer } from './types.ts'
import {
  doneAsyncIteratorResult,
  errorAsyncIteratorResult,
  asyncIteratorResult,
} from './helpers.ts'

export const pullFromStream = <T>(stream: NodeJS.ReadableStream): PullProducer<T> => {
  const waiters: (() => void)[] = []
  const values: (() => Promise<IteratorResult<T>>)[] = []
  let isDone = false

  /* wake exactly one pending pull per delivered chunk */
  const pushValue = (thunk: () => Promise<IteratorResult<T>>): void => {
    values.push(thunk)
    waiters.shift()?.()
  }

  subscribeAsync<T>({
    next(value) {
      return new Promise<void>((resolve) => {
        pushValue(() => {
          resolve()

          return asyncIteratorResult(value)
        })
      })
    },
    error(e) {
      return new Promise<void>((resolve) => {
        pushValue(() => {
          resolve()

          return errorAsyncIteratorResult(e)
        })
      })
    },
    complete() {
      isDone = true

      /* end of stream is terminal: every pending pull must observe it */
      waiters.splice(0).forEach((wake) => wake())
    },
  })(stream)

  return async () => {
    while (true) {
      if (values.length > 0) {
        return values.shift()!()
      }

      if (isDone) {
        return doneAsyncIteratorResult()
      }

      await new Promise<void>((resolve) => {
        waiters.push(resolve)
      })
    }
  }
}
