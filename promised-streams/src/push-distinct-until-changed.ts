import { PushConsumer } from './types'
import { pushDistinct } from './push-distinct'

const isNotEqual = (a: any, b: any) => a !== b

export const pushDistinctUntilChanged = <T> (consumer: PushConsumer<T>): PushConsumer<T> =>
  pushDistinct(isNotEqual)(consumer)

