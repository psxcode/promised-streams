import { AsyncPushConsumer, AsyncPullProducer } from './types'
import { doneAsyncIteratorResult, errorAsyncIteratorResult, asyncIteratorResult } from './helpers'

export const pushMap = <T, R> (xf: (arg: T) => Promise<R> | R) =>
  (consumer: AsyncPushConsumer<R>): AsyncPushConsumer<T> => async (result) => {
    const { done, value } = await result

    if (done) {
      return consumer(doneAsyncIteratorResult())
    }

    let transformed: R
    try {
      transformed = await xf(value)
    } catch (e) {
      return consumer(errorAsyncIteratorResult(e))
    }

    return consumer(asyncIteratorResult(transformed))
  }

export const pullMap = <T, R> (xf: (arg: T) => Promise<R> | R) =>
  (producer: AsyncPullProducer<T>): AsyncPullProducer<R> => async () => {
    try {
      const { done, value } = await producer()

      return done
        ? doneAsyncIteratorResult()
        : asyncIteratorResult(await xf(value))
    } catch (e) {
      return errorAsyncIteratorResult(e)
    }
  }
