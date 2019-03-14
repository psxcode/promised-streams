import { PushConsumer } from './types'
import { errorAsyncIteratorResult } from './helpers'

const pushSide = <T> (sideFn: (value: T) => Promise<void> | void) => (consumer: PushConsumer<T>): PushConsumer<T> =>
  async (result) => {
    let ir: IteratorResult<T>
    try {
      ir = await result
    } catch {
      return consumer(result)
    }

    if (ir.done) {
      return consumer(result)
    }

    try {
      await sideFn(ir.value)
    } catch (e) {
      return consumer(errorAsyncIteratorResult(e))
    }

    return consumer(result)
  }

export default pushSide
