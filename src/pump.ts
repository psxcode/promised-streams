import { AsyncIteratorResult, AsyncPassiveProducer, AsyncPassiveConsumer } from './types'

export const pump = <T> (producer: AsyncPassiveProducer<T>) => async (consumer: AsyncPassiveConsumer<T>) => {
  let air: AsyncIteratorResult<T>
  while (await consumer(air = producer()) && !(await air).done);
}
