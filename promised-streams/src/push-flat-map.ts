import { PushConsumer, PushProducer } from './types'
import pushMap from './push-map'
import pushFlatten from './push-flatten'

const pushFlatMap = <T, R> (xf: (arg: T) => Promise<PushProducer<R>> | PushProducer<R>) =>
  (consumer: PushConsumer<R>): PushConsumer<T> => pushMap(xf)(pushFlatten(consumer))

export default pushFlatMap
