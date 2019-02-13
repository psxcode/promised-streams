import ReadableStream = NodeJS.ReadableStream
import { subscribe, subscribeAsync } from 'node-streams'
import { AsyncPushProducer, PushProducer, AsyncIteratorResult, AsyncPullProducer } from './types'
import { doneAsyncIteratorResult, doneIteratorResult, iteratorResult, errorAsyncIteratorResult, asyncIteratorResult } from './helpers'

export const pushStream = <T> (stream: ReadableStream): PushProducer<T> =>
  (consumer) => {
    const unsubscribe = subscribe({
      next (value) {
        try {
          consumer(iteratorResult(value))
        } catch {
          unsubscribe()
        }
      },
      complete () {
        consumer(doneIteratorResult())
      },
    })(stream)
  }

export const pushStreamAsync = <T> (stream: ReadableStream): AsyncPushProducer<T> =>
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

export const pullStreamAsync = <T> (stream: ReadableStream): AsyncPullProducer<T> => {
  let nextPromise: { resolve: (v?: any) => void, reject: (e?: any) => void } | undefined
  let nextAir: (() => AsyncIteratorResult<T>) | undefined
  let nextErrorAir: AsyncIteratorResult<T> | undefined
  let nextDoneAir: AsyncIteratorResult<T> | undefined

  const unsubscribe = subscribeAsync({
    next (value) {
      return new Promise((resolve) => {
        const air = asyncIteratorResult(value)
        if (nextPromise) {
          nextPromise.resolve(air)
          nextPromise = undefined
        } else {
          nextAir = () => (resolve(), air)
        }
      })
    },
    error (e) {
      unsubscribe()
      if (nextPromise) {
        nextPromise.reject(e)
      } else {
        nextErrorAir = errorAsyncIteratorResult(e)
      }
    },
    complete () {
      const doneAir = doneAsyncIteratorResult()
      if (nextPromise) {
        nextPromise.resolve(doneAir)
      } else {
        nextDoneAir = doneAir
      }
    },
  })(stream)

  return async () => {
    return new Promise((resolve, reject) => {
      if (nextAir) {
        resolve(nextAir())
        nextAir = undefined
      } else if (nextErrorAir) {
        resolve(nextErrorAir)
        nextErrorAir = undefined
      } else if (nextDoneAir) {
        resolve(nextDoneAir)
        nextDoneAir = undefined
      } else {
        nextPromise = { resolve, reject }
      }
    })
  }
}
