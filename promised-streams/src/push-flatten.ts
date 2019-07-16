import { PushConsumer, PushProducer } from './types'

const stripDone = (consumer: PushConsumer<any>): PushConsumer<any> => async (result) => {
  let ir: IteratorResult<any>
  try {
    ir = await result
  } catch {
    return consumer(result as any)
  }

  if (ir.done) {
    return
  }

  return consumer(result)
}

const pushFlatten = <T> (consumer: PushConsumer<T>): PushConsumer<PushProducer<T>> =>
  async (result) => {
    let ir: IteratorResult<PushProducer<T>>
    try {
      ir = await result
    } catch {
      return consumer(result as any)
    }

    if (ir.done) {
      return consumer(result as any)
    }

    return ir.value(stripDone(consumer))
  }

export default pushFlatten
