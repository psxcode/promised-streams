import { PullProducer } from './types'

const pullDistinct = <T> (isAllowed: (prev: T, next: T) => Promise<boolean> | boolean) =>
  (producer: PullProducer<T>): PullProducer<T> => {
    let prevValue: T = producer as any // initial value

    return async () => {
      while (true) {
        const ir = await producer()

        if (ir.done || await isAllowed(prevValue, ir.value)) {
          prevValue = ir.value

          return ir
        }
      }
    }
  }

export default pullDistinct
