import { subscribeAsync } from 'node-streams'
import { PushProducer } from './types'
import { doneAsyncIteratorResult, errorAsyncIteratorResult, asyncIteratorResult } from './helpers'

const pushFromStream = <T> (stream: NodeJS.ReadableStream): PushProducer<T> =>
  (consumer) => new Promise((resolve) => {
    let promise = Promise.resolve()

    const onError = () => {
      unsubscribe()
      resolve()
    }

    const unsubscribe = subscribeAsync({
      next (value) {
        return promise = promise
          .then(() => consumer(asyncIteratorResult(value)))
          .catch(onError)
      },
      error (e) {
        return promise = promise
          .then(() => consumer(errorAsyncIteratorResult(e)))
          .catch(onError)
      },
      async complete () {
        try {
          await promise
          await consumer(doneAsyncIteratorResult())
        } catch {}
        resolve()
      },
    })(stream)
  })

export default pushFromStream
