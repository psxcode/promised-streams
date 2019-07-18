import { PushConsumer } from './types'

const pushDo = <T> (doFunction: (result: T) => void | Promise<void>) => (consumer: PushConsumer<T>): PushConsumer<T> =>
  async (result) => {
    let ir: IteratorResult<T>
    try {
      ir = await result
    } catch {
      return consumer(result as any)
    }

    if (ir.done) {
      return consumer(result as any)
    }

    try {
      await doFunction(ir.value)
    } catch {
    }

    return consumer(result)
  }

export default pushDo
