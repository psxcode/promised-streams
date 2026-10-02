import type { PushConsumer, PushProducer } from './types.ts'

const stripDone =
  (consumer: PushConsumer<any>): PushConsumer<any> =>
  async (result) => {
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

const pushDoResult =
  (doFunction: (result: Promise<void>) => void) =>
  (consumer: PushConsumer<any>): PushConsumer<any> =>
  async (result) => {
    const consumerResult = consumer(result)

    try {
      doFunction(consumerResult)
    } catch {}

    return consumerResult
  }

export const pushHoFlatten =
  <T>(consumer: PushConsumer<T>): PushConsumer<PushProducer<T>> =>
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
    await ir.value(pushDoResult((nextResult) => (consumerResult = nextResult))(stripDone(consumer)))

    return consumerResult
  }
