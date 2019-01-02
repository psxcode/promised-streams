import { iterate } from 'iterama'
import {
  AsyncPullProducer,
  AsyncPushProducer,
  PullProducer,
  PushProducer,
  SOK,
} from './types'

export const push = <T> (iterable: Iterable<T>): PushProducer<T> =>
  (consumer) => {
    const it = iterate(iterable)
    let ir: IteratorResult<T>

    while (consumer(ir = it.next()) === SOK && !ir.done);
  }

export const pushAsync = <T> (iterable: Iterable<T>): AsyncPushProducer<T> =>
  async (consumer) => {
    const it = iterate(iterable)
    let ir: IteratorResult<T>

    while ((await consumer(Promise.resolve(ir = it.next()))) === SOK && !ir.done);
  }

export const pull = <T> (iterable: Iterable<T>): PullProducer<T> => {
  const it = iterate(iterable)

  return () => it.next()
}

export const pullAsync = <T> (iterable: Iterable<T>): AsyncPullProducer<T> => {
  const it = iterate(iterable)

  return () => Promise.resolve(it.next())
}
