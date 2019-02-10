import { AsyncIteratorResult, AsyncPullProducer, AsyncPushConsumer } from './types'

const pump = <T> (producer: AsyncPullProducer<T>) => async (consumer: AsyncPushConsumer<T>): Promise<void> => {
  let air: AsyncIteratorResult<T>

  try {
    while (!(await (air = producer())).done) {
      await consumer(air)
    }
    /* done */
    await consumer(air)
  } catch (e) {
    return
  }
}

export default pump
