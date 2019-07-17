import { describe, it } from 'mocha'
import { expect } from 'chai'
import debug from 'debug'
import fn from 'test-fn'
import { pipe, compose } from '@psxcode/compose'
import { pullConsumer, pullProducer, pushConsumer, pushProducer } from 'promised-streams-test/src'
import { pullMap, pullReduce, pushMap, pushReduce, PushConsumer } from '../src'
import makeNumbers from './make-numbers'

const producerLog = debug('ai:producer')
const consumerLog = debug('ai:consumer')
const mapLog = debug('ai:map')
const reducerLog = debug('ai:reducer')
const sinkLog = debug('ai:sink')
const mult2 = (value: number) => {
  mapLog('mapping value')

  return value * 2
}
const addReducer = (state: string, value: number) => {
  reducerLog(value)

  return state !== undefined ? state + value : ''
}

describe('[ composition ]', () => {
  it('piped pull consumer', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t0 = pullMap(mult2)
    const t1 = pullReduce(addReducer)
    const r = pullProducer({ log: producerLog, dataResolveDelay: 50 })(data)

    const pipedTransforms = pipe(t0, t1)
    const pipedConsumer = pipe(t0, pipedTransforms, w)

    await pipedConsumer(r)

    expect(spy.calls).deep.eq([
      [{ value: '04812', done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('piped pull producer', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t0 = pullMap(mult2)
    const t1 = pullReduce(addReducer)
    const r = pullProducer({ log: producerLog, dataResolveDelay: 50 })(data)

    const pipedTransforms = pipe(t0, t1)
    const pipedProducer = pipe(t0, pipedTransforms)(r)

    await w(pipedProducer)

    expect(spy.calls).deep.eq([
      [{ value: '04812', done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('composed push producer', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w: PushConsumer<string> = pushConsumer({ log: consumerLog })(spy)
    const t0 = pushMap(mult2)
    const t1 = pushReduce(addReducer)
    const r = pushProducer({ log: producerLog, dataResolveDelay: 50 })(data)

    const composedTransforms = compose(t0, t1)
    const composedProducer = compose(r, t0, composedTransforms)

    await composedProducer(w)

    expect(spy.calls).deep.eq([
      [{ value: '04812', done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('composed push consumer', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w: PushConsumer<string> = pushConsumer({ log: consumerLog })(spy)
    const t0 = pushMap(mult2)
    const t1 = pushReduce(addReducer)
    const r = pushProducer({ log: producerLog, dataResolveDelay: 50 })(data)

    const composedTransforms = compose(t0, t1)
    const composedConsumer = compose(t0, composedTransforms)(w)

    await r(composedConsumer)

    expect(spy.calls).deep.eq([
      [{ value: '04812', done: false }],
      [{ value: undefined, done: true }],
    ])
  })
})
