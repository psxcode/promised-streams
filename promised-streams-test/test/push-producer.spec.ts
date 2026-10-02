import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { debug } from './helpers/debug.ts'
import { fn } from './helpers/fn.ts'
import { pushProducer, pushConsumer } from '../src/index.ts'
import { makeNumbers } from './make-numbers.ts'

const producerLog = debug('ait:producer')
const consumerLog = debug('ait:consumer')
const sinkLog = debug('ait:sink')

describe('[ push-producer / push-consumer ]', () => {
  it('should work', async () => {
    const data = makeNumbers(2)
    const spy = fn(sinkLog)
    const r = pushProducer()(data)
    const w = pushConsumer()(spy)

    await r(w)

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle producer data resolve delay', async () => {
    const data = makeNumbers(2)
    const spy = fn(sinkLog)
    const r = pushProducer({ log: producerLog, dataResolveDelay: 50 })(data)
    const w = pushConsumer({ log: consumerLog })(spy)

    await r(w)

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle producer data prepare delay', async () => {
    const data = makeNumbers(2)
    const spy = fn(sinkLog)
    const r = pushProducer({ log: producerLog, dataPrepareDelay: 50 })(data)
    const w = pushConsumer({ log: consumerLog })(spy)

    await r(w)

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle consumer delay', async () => {
    const data = makeNumbers(2)
    const spy = fn(sinkLog)
    const r = pushProducer({ log: producerLog })(data)
    const w = pushConsumer({ log: consumerLog, delay: 50 })(spy)

    await r(w)

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle producer error', async () => {
    const data = makeNumbers(2)
    const spy = fn(sinkLog)
    const r = pushProducer({ log: producerLog, errorAtStep: 1 })(data)
    const w = pushConsumer({ log: consumerLog })(spy)

    await r(w)

    assert.deepStrictEqual(spy.calls, [[{ value: 0, done: false }]])
  })

  it('should handle producer error on complete', async () => {
    const data = makeNumbers(2)
    const spy = fn(sinkLog)
    const r = pushProducer({ log: producerLog, errorAtStep: 2 })(data)
    const w = pushConsumer({ log: consumerLog })(spy)

    await r(w)

    assert.deepStrictEqual(spy.calls, [[{ value: 0, done: false }], [{ value: 1, done: false }]])
  })

  it('should handle producer error and continue', async () => {
    const data = makeNumbers(3)
    const spy = fn(sinkLog)
    const r = pushProducer({ log: producerLog, errorAtStep: 1 })(data)
    const w = pushConsumer({ log: consumerLog, continueOnError: true })(spy)

    await r(w)

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 2, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle consumer crash', async () => {
    const data = makeNumbers(2)
    const spy = fn(sinkLog)
    const r = pushProducer({ log: producerLog })(data)
    const w = pushConsumer({ log: consumerLog, crashAtStep: 1 })(spy)

    await r(w)

    assert.deepStrictEqual(spy.calls, [[{ value: 0, done: false }]])
  })

  it('should handle consumer crash on complete', async () => {
    const data = makeNumbers(2)
    const spy = fn(sinkLog)
    const r = pushProducer({ log: producerLog })(data)
    const w = pushConsumer({ log: consumerLog, crashAtStep: 2 })(spy)

    await r(w)

    assert.deepStrictEqual(spy.calls, [[{ value: 0, done: false }], [{ value: 1, done: false }]])
  })

  it('should handle consumer cancel', async () => {
    const data = makeNumbers(2)
    const spy = fn(sinkLog)
    const r = pushProducer({ log: producerLog })(data)
    const w = pushConsumer({ log: consumerLog, cancelAtStep: 1 })(spy)

    await r(w)

    assert.deepStrictEqual(spy.calls, [[{ value: 0, done: false }], [{ value: 1, done: false }]])
  })

  it('should handle consumer cancel on complete', async () => {
    const data = makeNumbers(2)
    const spy = fn(sinkLog)
    const r = pushProducer({ log: producerLog })(data)
    const w = pushConsumer({ log: consumerLog, cancelAtStep: 2 })(spy)

    await r(w)

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: undefined, done: true }],
    ])
  })
})
