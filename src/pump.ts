import { AsyncIteratorResult, AsyncPullProducer, AsyncPushConsumer } from './types'

export const pump = <T> (producer: AsyncPullProducer<T>) => async (consumer: AsyncPushConsumer<T>) => {
  let air: AsyncIteratorResult<T>
  while (await consumer(air = producer()) && !(await air).done);
}
