import { waitTime } from '@psxcode/wait'
import { PushConsumer } from './types'
import { pushThrottle } from './push-throttle'

export const pushThrottleTime = (ms: number) => <T> (consumer: PushConsumer<T>): PushConsumer<T> =>
  pushThrottle((cb) => waitTime(cb)(ms))(consumer)
