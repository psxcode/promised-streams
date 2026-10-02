import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { debug } from './helpers/debug.ts'
import { fn } from './helpers/fn.ts'
import { pullConsumer, pushProducer } from '../../promised-streams-test/src/index.ts'
import { waitTimePromise as wait } from '../src/internal.ts'
import { pool } from '../src/index.ts'
import { makeNumbers } from './make-numbers.ts'

const producerLog = debug('ai:producer')
const consumerLog = debug('ai:consumer')
const sinkLog = debug('ai:sink')

describe('[ pool ]', () => {
  it('should work', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pushProducer({ log: producerLog })(data)
    const { pull, push } = pool<number>()

    await (r(push), w(pull))

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle separate connection: consumer then producer', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pushProducer({ log: producerLog })(data)
    const { pull, push } = pool<number>()

    /* first connect consumer */
    const consumer = w(pull)

    /* wait */
    await wait(50)

    /* connect producer */
    r(push)

    /* wait for consumer */
    await consumer

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle separate connection: producer then consumer', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pushProducer({ log: producerLog })(data)
    const { pull, push } = pool<number>()

    /* first connect producer */
    r(push)

    /* wait */
    await wait(50)

    /* connect consumer and wait for consumer */
    await w(pull)

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle consumer delay', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog, delay: 50 })(spy)
    const r = pushProducer({ log: producerLog })(data)
    const { pull, push } = pool<number>()

    await (r(push), w(pull))

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle producer delay', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pushProducer({ log: producerLog, dataPrepareDelay: 50, dataResolveDelay: 50 })(data)
    const { pull, push } = pool<number>()

    await (r(push), w(pull))

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle consumer delay with highWatermark', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog, delay: 50 })(spy)
    const r = pushProducer({ log: producerLog })(data)
    const { pull, push } = pool<number>({ highWatermark: 1 })

    await (r(push), w(pull))

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should deliver producer error to consumer', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pushProducer({ log: producerLog, errorAtStep: 2 })(data)
    const { pull, push } = pool<number>()

    try {
      await (r(push), w(pull))

      assert.fail('should not get here')
    } catch {
      assert.deepStrictEqual(spy.calls, [[{ value: 0, done: false }], [{ value: 1, done: false }]])
    }
  })
})
