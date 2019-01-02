import { iterate } from 'iterama'
import {
  AsyncPassiveProducer,
  AsyncActiveProducer,
  PassiveProducer,
  ActiveProducer,
  SOK,
} from './types'

export const pushIterable = <T> (iterable: Iterable<T>): ActiveProducer<T> => (consumer) => {
  const it = iterate(iterable)
  let ir: IteratorResult<T>

  while (consumer(ir = it.next()) === SOK && !ir.done) {}
}

export const pushIterableAsync = <T> (iterable: Iterable<T>): AsyncActiveProducer<T> => async (consumer) => {
  const it = iterate(iterable)
  let ir: IteratorResult<T>

  while ((await consumer(Promise.resolve(ir = it.next()))) === SOK && !ir.done) {}
}

export const pullIterable = <T> (iterable: Iterable<T>): PassiveProducer<T> => {
  const it = iterate(iterable)

  return () => it.next()
}

export const pullIterableAsync = <T> (iterable: Iterable<T>): AsyncPassiveProducer<T> => {
  const it = iterate(iterable)

  return () => Promise.resolve(it.next())
}
