import type { PullProducer } from './types.ts'
import { pullHoFlatten } from './pull-ho-flatten.ts'
import { pullMap } from './pull-map.ts'

export const pullFlatMap =
  <T, R>(xf: (arg: T) => Promise<PullProducer<R>> | PullProducer<R>) =>
  (producer: PullProducer<T>): PullProducer<R> =>
    pullHoFlatten(pullMap(xf)(producer))
