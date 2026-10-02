import type { PushConsumer, PushProducer } from './types.ts'
import { pushMap } from './push-map.ts'
import { pushHoFlatten } from './push-ho-flatten.ts'

export const pushFlatMap =
  <T, R>(xf: (arg: T) => Promise<PushProducer<R>> | PushProducer<R>) =>
  (consumer: PushConsumer<R>): PushConsumer<T> =>
    pushMap(xf)(pushHoFlatten(consumer))
