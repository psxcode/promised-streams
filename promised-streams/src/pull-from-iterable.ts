import { iterate } from 'iterama'
import { PullProducer } from './types'

export const pullFromIterable = <T> (iterable: Iterable<T>): PullProducer<T> => {
  const it = iterate(iterable)

  return () => Promise.resolve(it.next())
}
