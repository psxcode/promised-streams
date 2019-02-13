import { iterate } from 'iterama'
import {
  AsyncPullProducer,
  AsyncPushProducer,
  PullProducer,
  PushProducer,
} from './types'

export const pushIterable = <T> (iterable: Iterable<T>): PushProducer<T> => (consumer) => {
  const it = iterate(iterable)

  while (true) {
    const ir = it.next()
    consumer(ir)

    if (ir.done) {
      return
    }
  }
}

export const pushIterableAsync = <T> (iterable: Iterable<T>): AsyncPushProducer<T> => async (consumer) => {
  const it = iterate(iterable)

  while (true) {
    const ir = it.next()
    await consumer(Promise.resolve(ir))

    if (ir.done) {
      return
    }
  }
}

export const pullIterable = <T> (iterable: Iterable<T>): PullProducer<T> => {
  const it = iterate(iterable)

  return () => it.next()
}

export const pullIterableAsync = <T> (iterable: Iterable<T>): AsyncPullProducer<T> => {
  const it = iterate(iterable)

  return () => Promise.resolve(it.next())
}
