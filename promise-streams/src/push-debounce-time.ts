import { waitTime } from '@psxcode/wait'
import { PushConsumer } from './types'
import pushDebounce from './push-debounce'

const pushDebounceTime = (ms: number) => <T> (consumer: PushConsumer<T>): PushConsumer<T> =>
  pushDebounce((cb) => waitTime(cb)(ms))(consumer)

export default pushDebounceTime
