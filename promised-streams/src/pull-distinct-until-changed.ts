import type { PullProducer } from './types.ts'
import { pullDistinct } from './pull-distinct.ts'

const isNotEqual = (a: any, b: any) => a !== b

export const pullDistinctUntilChanged = <T>(producer: PullProducer<T>): PullProducer<T> =>
  pullDistinct(isNotEqual)(producer)
