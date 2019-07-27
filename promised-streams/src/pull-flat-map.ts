import { PullProducer } from './types'
import { pullHoFlatten } from './pull-ho-flatten'
import { pullMap } from './pull-map'

export const pullFlatMap = <T, R> (xf: (arg: T) => Promise<PullProducer<R>> | PullProducer<R>) =>
  (producer: PullProducer<T>): PullProducer<R> => pullHoFlatten(pullMap(xf)(producer))

