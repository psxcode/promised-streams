import { waitTime } from '@psxcode/wait'
import { AsyncPushConsumer } from './types'
import { pushDebounce } from './debounce'

export const pushDebounceTime = (ms: number) => <T> (consumer: AsyncPushConsumer<T>): AsyncPushConsumer<T> =>
  pushDebounce((cb) => waitTime(cb)(ms))(consumer)
