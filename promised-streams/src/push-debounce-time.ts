import { waitTime } from './internal.ts'
import type { PushConsumer } from './types.ts'
import { pushDebounce } from './push-debounce.ts'

export const pushDebounceTime =
  (ms: number) =>
  <T>(consumer: PushConsumer<T>): PushConsumer<T> =>
    pushDebounce((cb) => waitTime(cb)(ms))(consumer)
