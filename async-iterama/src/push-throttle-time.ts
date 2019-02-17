import { waitTime } from '@psxcode/wait'
import { PushConsumer } from './types'
import pushThrottle from './push-throttle'

const pushThrottleTime = (ms: number) => <T> (consumer: PushConsumer<T>): PushConsumer<T> =>
  pushThrottle((cb) => waitTime(cb)(ms))(consumer)

export default pushThrottleTime
