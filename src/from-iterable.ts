import { iterate } from 'iterama'
import {
  AsyncPullProducer,
  AsyncPushProducer,
  PullProducer,
  PushProducer,
  SOK,
} from './types'

export const pushIterable = <T> (iterable: Iterable<T>): PushProducer<T> => (consumer) => {
  const it = iterate(iterable)
  let ir: IteratorResult<T>

  while (consumer(ir = it.next()) === SOK && !ir.done) {}
}

export const pushIterableAsync = <T> (iterable: Iterable<T>): AsyncPushProducer<T> => async (consumer) => {
  const it = iterate(iterable)
  let ir: IteratorResult<T>

  while ((await consumer(Promise.resolve(ir = it.next()))) === SOK && !ir.done) {}
}

export const pullIterable = <T> (iterable: Iterable<T>): PullProducer<T> => {
  const it = iterate(iterable)

  return () => it.next()
}

export const pullIterableAsync = <T> (iterable: Iterable<T>): AsyncPullProducer<T> => {
  const it = iterate(iterable)

  return () => Promise.resolve(it.next())
}
