import { iterate } from 'iterama'
import { PullProducer } from './types'

const pullIterable = <T> (iterable: Iterable<T>): PullProducer<T> => {
  const it = iterate(iterable)

  return () => Promise.resolve(it.next())
}

export default pullIterable
