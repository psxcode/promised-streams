import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { debug } from './helpers/debug.ts'
import { fn } from './helpers/fn.ts'
import { pushConsumer, pushProducer } from '../../promised-streams-test/src/index.ts'
import { pushScan } from '../src/index.ts'
import { makeNumbers } from './make-numbers.ts'

const producerLog = debug('ai:producer')
const consumerLog = debug('ai:consumer')
const sinkLog = debug('ai:sink')
const reducerLog = debug('ai:reducer')
const reducer = (state?: number, value?: number) => {
  reducerLog(`received state: ${state}, value: ${value}`)

  return state == null ? 0 : state + value!
}
const areducer = async (state?: number, value?: number) => {
  reducerLog(`received state: ${state}, value: ${value}`)

  return state == null ? 0 : state + value!
}
const ereducer = (state?: number, value?: number) => {
  reducerLog('throwing error')
  void state
  void value
  throw new Error('reducer error')
}
const ereducer2 = (state?: number, value?: number) => {
  if (state == null) {
    return 0
  }
  reducerLog('throwing error')
  void state
  void value
  throw new Error('reducer error')
}

describe('[ pushScan ]', () => {
  it('should work', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t = pushScan(reducer)
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 3, done: false }],
      [{ value: 6, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should work with async reducer', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t = pushScan(areducer)
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 3, done: false }],
      [{ value: 6, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should deliver consumer cancel', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, cancelAtStep: 0 })(spy)
    const t = pushScan(reducer)
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    assert.deepStrictEqual(spy.calls, [[{ value: 0, done: false }]])
  })

  it('should deliver consumer crash', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, crashAtStep: 1 })(spy)
    const t = pushScan(reducer)
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    assert.deepStrictEqual(spy.calls, [[{ value: 0, done: false }]])
  })

  it('should deliver producer error to consumer', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t = pushScan(reducer)
    const r = pushProducer({ log: producerLog, errorAtStep: 2 })(data)

    await r(t(w))

    assert.deepStrictEqual(spy.calls, [[{ value: 0, done: false }], [{ value: 1, done: false }]])
  })

  it('should be able to continue on producer error', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, continueOnError: true })(spy)
    const t = pushScan(reducer)
    const r = pushProducer({ log: producerLog, errorAtStep: 2 })(data)

    await r(t(w))

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 4, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should deliver reducer error to consumer', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t = pushScan(ereducer)
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    assert.deepStrictEqual(spy.calls, [])
  })

  it('should deliver reducer error to consumer', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t = pushScan(ereducer2)
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    assert.deepStrictEqual(spy.calls, [])
  })
})
