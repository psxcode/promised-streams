import { AsyncPushConsumer, AsyncPullProducer } from './types'
import { pushDistinct, pullDistinct } from './distinct'

const isNotEqual = (a: any, b: any) => a !== b

export const pushDistinctUntilChanged = <T> (consumer: AsyncPushConsumer<T>): AsyncPushConsumer<T> =>
  pushDistinct(isNotEqual)(consumer)

export const pullDistinctUntilChanged = <T> (producer: AsyncPullProducer<T>): AsyncPullProducer<T> =>
  pullDistinct(isNotEqual)(producer)
