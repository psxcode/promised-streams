import { PullProducer, PushProducer } from './types'

function pullWithLatest (): <T>(main: PullProducer<T>) => PullProducer<[T]>
function pullWithLatest <T1>(p1: PushProducer<T1>): <T>(main: PullProducer<T>) => PullProducer<[T, T1]>
function pullWithLatest <T1, T2>(p1: PushProducer<T1>, p2: PushProducer<T2>): <T>(main: PullProducer<T>) => PullProducer<[T, T1, T2]>
function pullWithLatest <T1, T2, T3>(p1: PushProducer<T1>, p2: PushProducer<T2>, p3: PushProducer<T3>): <T>(main: PullProducer<T>) => PullProducer<[T, T1, T2, T3]>

function pullWithLatest (...producers: PushProducer<any>[]) {
  return (mainProducer: PullProducer<any>): PullProducer<any[]> => {
    return async () => {
    }
  }
}

export default pullWithLatest
