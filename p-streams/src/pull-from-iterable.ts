import { iterate } from 'iterama'
import { PullProducer } from './types'

const pullFromIterable = <T> (iterable: Iterable<T>): PullProducer<T> => {
  const it = iterate(iterable)

  return () => Promise.resolve(it.next())
}

export default pullFromIterable
