import { waitTime } from './internal.ts'
import type { PushConsumer } from './types.ts'
import { pushThrottle } from './push-throttle.ts'

export const pushThrottleTime =
  (ms: number) =>
  <T>(consumer: PushConsumer<T>): PushConsumer<T> =>
    pushThrottle((cb) => waitTime(cb)(ms))(consumer)
