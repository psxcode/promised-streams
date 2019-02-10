import { iterate } from 'iterama'
import {
  AsyncPullProducer,
  AsyncPushProducer,
  PullProducer,
  PushProducer,
} from './types'

export const pushIterable = <T> (iterable: Iterable<T>): PushProducer<T> => (consumer) => {
  const it = iterate(iterable)
  let ir: IteratorResult<T>

  try {
    while (!(ir = it.next()).done) {
      consumer(ir)
    }
    /* done */
    consumer(ir)
  } catch (e) {
    return
  }
}

export const pushIterableAsync = <T> (iterable: Iterable<T>): AsyncPushProducer<T> => async (consumer) => {
  const it = iterate(iterable)
  let ir: IteratorResult<T>

  try {
    while (!(ir = it.next()).done) {
      await consumer(Promise.resolve(ir))
    }
  } catch (e) {
    return
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
