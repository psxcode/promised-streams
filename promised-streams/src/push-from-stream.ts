import { subscribeAsync } from './internal.ts'
import type { PushProducer } from './types.ts'
import {
  doneAsyncIteratorResult,
  errorAsyncIteratorResult,
  asyncIteratorResult,
} from './helpers.ts'

export const pushFromStream =
  <T>(stream: NodeJS.ReadableStream): PushProducer<T> =>
  (consumer) =>
    new Promise<void>((resolve) => {
      const onReject = () => {
        unsub()
        resolve()
      }
      const unsub = subscribeAsync<T>({
        async next(value) {
          try {
            await consumer(asyncIteratorResult(value))
          } catch {
            onReject()
          }
        },
        async error(e) {
          try {
            await consumer(errorAsyncIteratorResult(e))
          } catch {
            onReject()
          }
        },
        async complete() {
          try {
            await consumer(doneAsyncIteratorResult())
          } catch {}
          resolve()
        },
      })(stream)
    })
