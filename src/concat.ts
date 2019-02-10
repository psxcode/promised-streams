import { AsyncPushConsumer, AsyncPullProducer, AsyncIteratorResult } from './types'
import { doneAsyncIteratorResult, errorAsyncIteratorResult } from './helpers'

export const pushConcat = <T> (...producers: AsyncPullProducer<T>[]) =>
  async (consumer: AsyncPushConsumer<T>): Promise<void> => {
    let i = 0

    try {
      while (true) {
        if (i >= producers.length) {
          await consumer(doneAsyncIteratorResult())

          return
        }

        let result: AsyncIteratorResult<T>
        let done: boolean
        try {
          result = producers[i]()
          done = (await result).done
        } catch (e) {
          await consumer(errorAsyncIteratorResult(e))
          ++i
          continue
        }

        if (done) {
          ++i
          continue
        }

        await consumer(result)
      }
    } catch (e) {
      return
    }
  }

export const pullConcat = <T> (...producers: AsyncPullProducer<T>[]): AsyncPullProducer<T> => {
  let i = 0

  return async () => {
    try {

      while (true) {
        if (i >= producers.length) {
          return doneAsyncIteratorResult()
        }

        const air = producers[i]()
        const { done } = await air

        if (done) {
          ++i
          continue
        }

        return air
      }
    } catch (e) {
      return errorAsyncIteratorResult(e)
    }
  }
}
