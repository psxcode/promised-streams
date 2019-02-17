import { subscribeAsync } from 'node-streams'
import { PushProducer } from './types'
import { doneAsyncIteratorResult, errorAsyncIteratorResult, asyncIteratorResult } from './helpers'

const pushStream = <T> (stream: NodeJS.ReadableStream): PushProducer<T> =>
  async (consumer) => {
    const unsubscribe = subscribeAsync({
      async next (value) {
        try {
          await consumer(asyncIteratorResult(value))
        } catch {
          unsubscribe()
        }
      },
      async error (e) {
        await consumer(errorAsyncIteratorResult(e))
      },
      async complete () {
        await consumer(doneAsyncIteratorResult())
      },
    })(stream)
  }

export default pushStream
