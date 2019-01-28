export type AsyncIteratorResult <T> = Promise<IteratorResult<T>>

export type Signal = number & { __signal__: any }

export const SOK = 0 as Signal
export const SCANCEL = 1 as Signal

export type PushConsumer <T> = (value: IteratorResult<T>) => Signal
export type AsyncPushConsumer <T> = (value: AsyncIteratorResult<T>) => Promise<Signal>

export type PushProducer <T> = (consumer: PushConsumer<T>) => void
export type AsyncPushProducer <T> = (consumer: AsyncPushConsumer<T>) => Promise<void>

export type PullProducer <T> = () => IteratorResult<T>
export type AsyncPullProducer <T> = () => AsyncIteratorResult<T>

export type PullConsumer <T> = (producer: PullProducer<T>) => void
export type AsyncPullConsumer <T> = (producer: AsyncPullProducer<T>) => void

export type IAsyncPool <T> = {
  push: AsyncPushConsumer<T>
  pull: AsyncPullProducer<T>
}
