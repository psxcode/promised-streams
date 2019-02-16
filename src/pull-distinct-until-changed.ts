import { PullProducer } from './types'
import pullDistinct from './pull-distinct'

const isNotEqual = (a: any, b: any) => a !== b

const pullDistinctUntilChanged = <T> (producer: PullProducer<T>): PullProducer<T> =>
  pullDistinct(isNotEqual)(producer)

export default pullDistinctUntilChanged
