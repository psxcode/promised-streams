import { AsyncPushConsumer, AsyncPullProducer } from './types'
import { errorAsyncIteratorResult } from './helpers'

export const pushDistinct = <T> (consumer: AsyncPushConsumer<T>): AsyncPushConsumer<T> => {
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

    if (last !== ir.value) {
      last = ir.value

      return consumer(result)
    }
  }
}

export const pullDistinct = <T> (producer: AsyncPullProducer<T>): AsyncPullProducer<T> => {
  let last: any = producer

  return async () => {
    try {
      while (true) {
        const ir = await producer()

        if (ir.done || last !== ir.value) {
          last = ir.value

          return ir
        }
      }
    } catch (e) {
      return errorAsyncIteratorResult(e)
    }
  }
}
