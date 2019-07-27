import { PushConsumer, PushProducer } from './types'
import { pushMap } from './push-map'
import { pushHoFlatten } from './push-ho-flatten'

export const pushFlatMap = <T, R> (xf: (arg: T) => Promise<PushProducer<R>> | PushProducer<R>) =>
  (consumer: PushConsumer<R>): PushConsumer<T> => pushMap(xf)(pushHoFlatten(consumer))
