import { PullProducer } from './types'
import pullFlatten from './pull-flatten'
import pullMap from './pull-map'

const pullFlatMap = <T, R> (xf: (arg: T) => Promise<PullProducer<R>> | PullProducer<R>) =>
  (producer: PullProducer<T>): PullProducer<R> => pullFlatten(pullMap(xf)(producer))

export default pullFlatMap
