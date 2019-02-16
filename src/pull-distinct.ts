import { PullProducer } from './types'

const pullDistinct = <T> (isAllowed: (prev: T, next: T) => boolean) => (producer: PullProducer<T>): PullProducer<T> => {
  let last: any = producer

  return async () => {
    while (true) {
      const ir = await producer()

      if (ir.done || isAllowed(last, ir.value)) {
        last = ir.value

        return ir
      }
    }
  }
}

export default pullDistinct
