import { subscribeAsync } from 'node-streams'
import { PushProducer } from './types'
import { doneAsyncIteratorResult, errorAsyncIteratorResult, asyncIteratorResult } from './helpers'

export const pushFromStream = <T> (stream: NodeJS.ReadableStream): PushProducer<T> =>
  (consumer) => new Promise((resolve) => {
    const onReject = () => {
      unsub()
      resolve()
    }
    const unsub = subscribeAsync({
      async next (value) {
        try {
          await consumer(asyncIteratorResult(value))
        } catch {
          onReject()
        }
      },
      async error (e) {
        try {
          await consumer(errorAsyncIteratorResult(e))
        } catch {
          onReject()
        }
      },
      async complete () {
        try {
          await consumer(doneAsyncIteratorResult())
        } catch {}
        resolve()
      },
    })(stream)
  })
