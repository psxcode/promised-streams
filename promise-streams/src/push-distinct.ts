import { PushConsumer } from './types'
import { errorAsyncIteratorResult } from './helpers'

const pushDistinct = <T> (isAllowed: (prev: T, next: T) => Promise<boolean> | boolean) => (consumer: PushConsumer<T>): PushConsumer<T> => {
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

    let allow: boolean
    try {
      allow = await isAllowed(last, ir.value)
    } catch (e) {
      return consumer(errorAsyncIteratorResult(e))
    }

    if (allow) {
      last = ir.value

      return consumer(result)
    }
  }
}

export default pushDistinct
