import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { debug } from './helpers/debug.ts'
import { fn } from './helpers/fn.ts'
import { pullConsumer, pullProducer } from '../../promised-streams-test/src/index.ts'
import { pullMerge } from '../src/index.ts'
import { makeNumbers } from './make-numbers.ts'
import { makeStrings } from './make-strings.ts'

const consumerLog = debug('ai:consumer')
const sinkLog = debug('ai:sink') as (arg: IteratorResult<number>) => void
let logIndex = 0
const producerLog = () => debug(`ai:producer${logIndex++}`)

describe('[ pullMerge ]', () => {
  it('should work', async () => {
    const data0 = makeNumbers(3)
    const data1 = makeStrings(2)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r0 = pullProducer({ log: producerLog() })(data0)
    const r1 = pullProducer({ log: producerLog() })(data1)
    const t = pullMerge(r0, r1)

    await w(t)

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: '0', done: false }],
      [{ value: 1, done: false }],
      [{ value: '1', done: false }],
      [{ value: 2, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should work with single producer', async () => {
    const data0 = makeNumbers(3)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pullProducer({ log: producerLog() })(data0)
    const t = pullMerge

    await w(t(r))

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should work with no producers', async () => {
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullMerge

    await w(t())

    assert.deepStrictEqual(spy.calls, [[{ value: undefined, done: true }]])
  })

  it('should handle consumer delay', async () => {
    const data0 = makeNumbers(2)
    const data1 = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog, delay: 30 })(spy)
    const r0 = pullProducer({ log: producerLog() })(data0)
    const r1 = pullProducer({ log: producerLog() })(data1)
    const t = pullMerge

    await w(t(r0, r1))

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 1, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should propagate producer error to consumer', async () => {
    const data0 = makeNumbers(2)
    const data1 = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r0 = pullProducer({ log: producerLog(), dataResolveDelay: 5 })(data0)
    const r1 = pullProducer({ log: producerLog(), errorAtStep: 0, dataPrepareDelay: 8 })(data1)
    const t = pullMerge

    try {
      await w(t(r0, r1))
      assert.fail('should not get here')
    } catch {
      assert.deepStrictEqual(spy.calls, [[{ value: 0, done: false }]])
    }
  })

  it('should propagate producer error to consumer and continue', async () => {
    const data0 = makeNumbers(2)
    const data1 = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog, continueOnError: true })(spy)
    const r0 = pullProducer({ log: producerLog() })(data0)
    const r1 = pullProducer({ log: producerLog(), errorAtStep: 0 })(data1)
    const t = pullMerge

    await w(t(r0, r1))

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle producer crash', async () => {
    const data0 = makeNumbers(2)
    const data1 = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r0 = pullProducer({ log: producerLog() })(data0)
    const r1 = pullProducer({ log: producerLog(), crashAtStep: 0 })(data1)
    const t = pullMerge

    try {
      await w(t(r0, r1))
      assert.fail('should not get here')
    } catch {
      assert.deepStrictEqual(spy.calls, [])
    }
  })
})
