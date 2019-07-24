import { PullProducer } from './types'

const pullHoFlatten = <T> (producer: PullProducer<PullProducer<T>>): PullProducer<T> => {
  let p: PullProducer<T> | null

  const get: PullProducer<T> = async (): Promise<IteratorResult<T>> => {
    if (!p) {
      const ir = await producer()

      if (ir.done) {
        return ir as any
      }

      p = ir.value
    }

    const ir = await p()

    if (ir.done) {
      p = null

      return get()
    }

    return ir
  }

  return get
}

export default pullHoFlatten
