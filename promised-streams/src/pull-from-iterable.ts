import { iterate } from './internal.ts'
import type { PullProducer } from './types.ts'

export const pullFromIterable = <T>(iterable: Iterable<T>): PullProducer<T> => {
  const it = iterate(iterable)

  return () => Promise.resolve(it.next())
}
