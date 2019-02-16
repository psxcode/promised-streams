import { subscribeAsync } from 'node-streams'
import { AsyncIteratorResult, PullProducer } from './types'
import { doneAsyncIteratorResult, errorAsyncIteratorResult, asyncIteratorResult } from './helpers'

const pullStream = <T> (stream: NodeJS.ReadableStream): PullProducer<T> => {
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

export default pullStream
