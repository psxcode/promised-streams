import type { PushConsumer } from './types.ts'
import { pushDistinct } from './push-distinct.ts'

const isNotEqual = (a: any, b: any) => a !== b

export const pushDistinctUntilChanged = <T>(consumer: PushConsumer<T>): PushConsumer<T> =>
  pushDistinct(isNotEqual)(consumer)
