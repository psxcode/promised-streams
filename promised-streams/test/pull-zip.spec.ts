import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { debug } from './helpers/debug.ts'
import { fn } from './helpers/fn.ts'
import { pullConsumer, pullProducer } from '../../promised-streams-test/src/index.ts'
import { pullZip } from '../src/index.ts'
import { makeNumbers } from './make-numbers.ts'

const consumerLog = debug('ai:consumer')
const sinkLog = debug('ai:sink')
let logIndex = 0
const producerLog = () => debug(`ai:producer${logIndex++}`)

describe('[ pullZip ]', () => {
  it('should work', async () => {
    const data0 = [0, 1, 2, 3]
    const data1 = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r0 = pullProducer({ log: producerLog() })(data0)
    const r1 = pullProducer({ log: producerLog() })(data1)
    const t = pullZip

    await w(t(r0, r1))

    assert.deepStrictEqual(spy.calls, [
      [{ value: [0, 0], done: false }],
      [{ value: [1, 1], done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should work with single producer', async () => {
    const data0 = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pullProducer({ log: producerLog() })(data0)
    const t = pullZip

    await w(t(r))

    assert.deepStrictEqual(spy.calls, [
      [{ value: [0], done: false }],
      [{ value: [1], done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should work with no producers', async () => {
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullZip

    await w(t())

    assert.deepStrictEqual(spy.calls, [[{ value: undefined, done: true }]])
  })

  it('should handle consumer delay', async () => {
    const data0 = [0, 1, 2, 3]
    const data1 = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog, delay: 30 })(spy)
    const r0 = pullProducer({ log: producerLog() })(data0)
    const r1 = pullProducer({ log: producerLog() })(data1)
    const t = pullZip

    await w(t(r0, r1))

    assert.deepStrictEqual(spy.calls, [
      [{ value: [0, 0], done: false }],
      [{ value: [1, 1], done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should propagate producer error to consumer', async () => {
    const data0 = [0, 1, 2, 3]
    const data1 = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r0 = pullProducer({ log: producerLog() })(data0)
    const r1 = pullProducer({ log: producerLog(), errorAtStep: 0 })(data1)
    const t = pullZip

    try {
      await w(t(r0, r1))

      assert.fail('should not get here')
    } catch {
      assert.deepStrictEqual(spy.calls, [])
    }
  })

  it('should propagate producer error to consumer and continue', async () => {
    const data0 = [0, 1, 2, 3]
    const data1 = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog, continueOnError: true })(spy)
    const r0 = pullProducer({ log: producerLog() })(data0)
    const r1 = pullProducer({ log: producerLog(), errorAtStep: 0 })(data1)
    const t = pullZip

    await w(t(r0, r1))

    assert.deepStrictEqual(spy.calls, [
      [{ value: [1, 1], done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle producer crash', async () => {
    const data0 = [0, 1, 2, 3]
    const data1 = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r0 = pullProducer({ log: producerLog() })(data0)
    const r1 = pullProducer({ log: producerLog(), crashAtStep: 0 })(data1)
    const t = pullZip

    try {
      await w(t(r0, r1))

      assert.fail('should not get here')
    } catch {
      assert.deepStrictEqual(spy.calls, [])
    }
  })
})
