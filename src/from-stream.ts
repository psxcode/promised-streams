import ReadableStream = NodeJS.ReadableStream
import { subscribe, subscribeReadable } from 'node-streams'
import { AsyncActiveProducer, ActiveProducer, SOK, AsyncPassiveProducer } from './types'
import { doneAsyncIteratorResult, doneIteratorResult, iteratorResult } from './helpers'

export const pushStream = <T> (stream: ReadableStream): ActiveProducer<T> => (consumer) => {
  const unsubscribe = subscribe({
    next (value) {
      consumer(iteratorResult(value)) === SOK || unsubscribe()
    },
    complete () {
      consumer(doneIteratorResult())
    },
  })(stream)
}

export const pushStreamAsync = <T> (stream: ReadableStream): AsyncActiveProducer<T> => (consumer) =>
  new Promise((resolve, reject) => {
    const unsubscribe = subscribeReadable({
      async next ({ value }) {
        (await consumer(value)) === SOK || unsubscribe()
      },
      async error (e) {
        await consumer(doneAsyncIteratorResult())
        reject(e)
      },
      async complete () {
        await consumer(doneAsyncIteratorResult())
        resolve()
      },
    })(stream)
  })

export const pullAsync = <T> (stream: ReadableStream): AsyncPassiveProducer<T> => {
  const it = iterate(iterable)
  return () => Promise.resolve(it.next())
}
