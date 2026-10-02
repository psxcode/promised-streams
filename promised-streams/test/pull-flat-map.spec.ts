import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { debug } from './helpers/debug.ts'
import { fn } from './helpers/fn.ts'
import { waitTimePromise as wait } from '../src/internal.ts'
import { pullConsumer, pullProducer } from '../../promised-streams-test/src/index.ts'
import { pullFlatMap } from '../src/index.ts'
import { makeNumbers } from './make-numbers.ts'

const producerLog = debug('ai:producer')
const hoproducerLog = debug('ai:hoproducer')
const consumerLog = debug('ai:consumer')
const mapLog = debug('ai:map')
const sinkLog = debug('ai:sink')
const mult2 = (value: number) => {
  mapLog('mapping value')

  return pullProducer({ log: hoproducerLog })([value, value])
}

const amult2 = async (value: number) => {
  mapLog('mapping value begin')
  await wait(50)
  mapLog('mapping value done')

  return pullProducer({ log: hoproducerLog })([value, value])
}

const emult2 = () => {
  throw new Error('error in mapper')
}

describe('[ pullFlatMap ]', () => {
  it('should work', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullFlatMap(mult2)
    const r = pullProducer({ log: producerLog })(data)

    await w(t(r))

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should work with async map', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullFlatMap(amult2)
    const r = pullProducer({ log: producerLog })(data)

    await w(t(r))

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should deliver mapper error to consumer', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullFlatMap(emult2)
    const r = pullProducer({ log: producerLog, errorAtStep: 2 })(data)

    try {
      await w(t(r))

      assert.fail('should not get here')
    } catch {
      assert.deepStrictEqual(spy.calls, [])
    }
  })

  it('should deliver producer error to consumer', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullFlatMap(mult2)
    const r = pullProducer({ log: producerLog, errorAtStep: 2 })(data)

    try {
      await w(t(r))

      assert.fail('should not get here')
    } catch {
      assert.deepStrictEqual(spy.calls, [
        [{ value: 0, done: false }],
        [{ value: 0, done: false }],
        [{ value: 1, done: false }],
        [{ value: 1, done: false }],
      ])
    }
  })

  it('should deliver producer error to consumer and continue', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog, continueOnError: true })(spy)
    const t = pullFlatMap(mult2)
    const r = pullProducer({ log: producerLog, errorAtStep: 2 })(data)

    await w(t(r))

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 1, done: false }],
      [{ value: 3, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle producer crash', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullFlatMap(mult2)
    const r = pullProducer({ log: producerLog, crashAtStep: 2 })(data)

    try {
      await w(t(r))

      assert.fail('should not get here')
    } catch {
      assert.deepStrictEqual(spy.calls, [
        [{ value: 0, done: false }],
        [{ value: 0, done: false }],
        [{ value: 1, done: false }],
        [{ value: 1, done: false }],
      ])
    }
  })
})
