import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { debug } from './helpers/debug.ts'
import { fn } from './helpers/fn.ts'
import { pullProducer, pullConsumer } from '../src/index.ts'
import { makeNumbers } from './make-numbers.ts'

const producerLog = debug('ait:producer')
const consumerLog = debug('ait:consumer')
const sinkLog = debug('ait:sink')

describe('[ pull-consumer / pull-producer ]', () => {
  it('should work', async () => {
    const data = makeNumbers(2)
    const spy = fn(sinkLog)
    const r = pullProducer()(data)
    const w = pullConsumer()(spy)

    await w(r)

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle producer data prepare delay', async () => {
    const data = makeNumbers(2)
    const spy = fn(sinkLog)
    const r = pullProducer({ log: producerLog, dataPrepareDelay: 50 })(data)
    const w = pullConsumer({ log: consumerLog })(spy)

    await w(r)

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle producer data resolve delay', async () => {
    const data = makeNumbers(2)
    const spy = fn(sinkLog)
    const r = pullProducer({ log: producerLog, dataResolveDelay: 50 })(data)
    const w = pullConsumer({ log: consumerLog })(spy)

    await w(r)

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle data consume delay', async () => {
    const data = makeNumbers(2)
    const spy = fn(sinkLog)
    const r = pullProducer({ log: producerLog })(data)
    const w = pullConsumer({ log: consumerLog, delay: 50 })(spy)

    await w(r)

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle producer crash', async () => {
    const data = makeNumbers(2)
    const spy = fn(sinkLog)
    const r = pullProducer({ log: producerLog, crashAtStep: 0 })(data)
    const w = pullConsumer({ log: consumerLog })(spy)

    try {
      await w(r)

      assert.fail('should not get here')
    } catch {
      assert.deepStrictEqual(spy.calls, [])
    }
  })

  it('should handle producer crash on complete', async () => {
    const data = makeNumbers(2)
    const spy = fn(sinkLog)
    const r = pullProducer({ log: producerLog, crashAtStep: 2 })(data)
    const w = pullConsumer({ log: consumerLog })(spy)

    try {
      await w(r)

      assert.fail('should not get here')
    } catch {
      assert.deepStrictEqual(spy.calls, [[{ value: 0, done: false }], [{ value: 1, done: false }]])
    }
  })

  it('should handle producer error', async () => {
    const data = makeNumbers(2)
    const spy = fn(sinkLog)
    const r = pullProducer({ log: producerLog, errorAtStep: 0 })(data)
    const w = pullConsumer({ log: consumerLog })(spy)

    try {
      await w(r)

      assert.fail('should not get here')
    } catch {
      assert.deepStrictEqual(spy.calls, [])
    }
  })

  it('should handle producer error on complete', async () => {
    const data = makeNumbers(2)
    const spy = fn(sinkLog)
    const r = pullProducer({ log: producerLog, errorAtStep: 2 })(data)
    const w = pullConsumer({ log: consumerLog })(spy)

    try {
      await w(r)

      assert.fail('should not get here')
    } catch {
      assert.deepStrictEqual(spy.calls, [[{ value: 0, done: false }], [{ value: 1, done: false }]])
    }
  })

  it('should handle delayed producer error', async () => {
    const data = makeNumbers(2)
    const spy = fn(sinkLog)
    const r = pullProducer({ log: producerLog, errorAtStep: 0, dataResolveDelay: 50 })(data)
    const w = pullConsumer({ log: consumerLog })(spy)

    try {
      await w(r)

      assert.fail('should not get here')
    } catch {
      assert.deepStrictEqual(spy.calls, [])
    }
  })

  it('should handle producer error and continue', async () => {
    const data = makeNumbers(2)
    const spy = fn(sinkLog)
    const r = pullProducer({ log: producerLog, errorAtStep: 0 })(data)
    const w = pullConsumer({ log: consumerLog, continueOnError: true })(spy)

    await w(r)

    assert.deepStrictEqual(spy.calls, [
      [{ value: 1, done: false }],
      [{ value: undefined, done: true }],
    ])
  })
})
