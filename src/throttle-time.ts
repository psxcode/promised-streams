import { waitTime } from '@psxcode/wait'
import { AsyncPushConsumer } from './types'
import { pushThrottle } from './throttle'

export const pushThrottleTime = (ms: number) => <T> (consumer: AsyncPushConsumer<T>): AsyncPushConsumer<T> =>
  pushThrottle((cb) => waitTime(cb)(ms))(consumer)
