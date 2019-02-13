import { AsyncPushConsumer, AsyncPullProducer } from './types'
import { errorAsyncIteratorResult } from './helpers'

export const pushDistinct = <T> (isEqual: (a: T, b: T) => boolean) => (consumer: AsyncPushConsumer<T>): AsyncPushConsumer<T> => {
  let last: any = consumer

  return async (result) => {
    let ir: IteratorResult<T>
    try {
      ir = await result
    } catch {
      return consumer(result)
    }

    if (ir.done) {
      last = undefined

      return consumer(result)
    }

    let isAllowed: boolean
    try {
      isAllowed = !isEqual(last, ir.value)
    } catch (e) {
      return consumer(errorAsyncIteratorResult(e))
    }

    if (isAllowed) {
      last = ir.value

      return consumer(result)
    }
  }
}

export const pullDistinct = <T> (isEqual: (a: T, b: T) => boolean) => (producer: AsyncPullProducer<T>): AsyncPullProducer<T> => {
  let last: any = producer

  return async () => {
    while (true) {
      const ir = await producer()

      if (ir.done || !isEqual(last, ir.value)) {
        last = ir.value

        return ir
      }
    }
  }
}
