import { subscribeAsync } from './internal.ts'
import type { PullProducer } from './types.ts'
import {
  doneAsyncIteratorResult,
  errorAsyncIteratorResult,
  asyncIteratorResult,
} from './helpers.ts'

export const pullFromStream = <T>(stream: NodeJS.ReadableStream): PullProducer<T> => {
  let hasValue: (() => void) | undefined = undefined
  const values: (() => Promise<IteratorResult<T>>)[] = []

  subscribeAsync<T>({
    next(value) {
      return new Promise<void>((resolve) => {
        values.push(() => {
          resolve()

          return asyncIteratorResult(value)
        })
        hasValue?.()
      })
    },
    error(e) {
      return new Promise<void>((resolve) => {
        values.push(() => {
          resolve()

          return errorAsyncIteratorResult(e)
        })
        hasValue?.()
      })
    },
    complete() {
      return new Promise<void>((resolve) => {
        values.push(() => {
          resolve()

          return doneAsyncIteratorResult()
        })
        hasValue?.()
      })
    },
  })(stream)

  return () =>
    new Promise<void>((resolve) => {
      if (values.length > 0) {
        resolve()
      } else {
        hasValue = () => resolve()
      }
    }).then(() => values.shift()!())
}
