import { AsyncIteratorResult, PullProducer, PushConsumer } from './types'

const pump = <T> (producer: PullProducer<T>) => async (consumer: PushConsumer<T>): Promise<void> => {
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
