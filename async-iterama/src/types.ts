export type PushConsumer <T> = (value: Promise<IteratorResult<T>>) => Promise<void>
export type PushProducer <T> = (consumer: PushConsumer<T>) => Promise<void>
export type PullProducer <T> = () => Promise<IteratorResult<T>>
export type PullConsumer <T> = (producer: PullProducer<T>) => Promise<void>

export type IPoolOptions = {
  highWatermark?: number
}

export type IPool <T> = {
  push: PushConsumer<T>
  pull: PullProducer<T>
}

export type WaitFn = (cb: () => void) => () => void
export type UnsubscribeFn = (() => void) | undefined
