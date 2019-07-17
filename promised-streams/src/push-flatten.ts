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

const pushDoResult = (doFunction: (result: Promise<void>) => void) => (consumer: PushConsumer<any>): PushConsumer<any> => async (result) => {
  const consumerResult = consumer(result)

  try {
    doFunction(consumerResult)
  } catch {
  }

  return consumerResult
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

    let consumerResult = Promise.resolve()
    await ir.value(pushDoResult((result) => consumerResult = result)(stripDone(consumer)))

    return consumerResult
  }

export default pushFlatten
