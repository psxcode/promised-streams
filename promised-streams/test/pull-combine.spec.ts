import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { debug } from './helpers/debug.ts'
import { fn } from './helpers/fn.ts'
import { pullConsumer, pullProducer } from '../../promised-streams-test/src/index.ts'
import { waitTimePromise as wait } from '../src/internal.ts'
import { pullCombine } from '../src/index.ts'
import { makeNumbers } from './make-numbers.ts'

const consumerLog = debug('ai:consumer')
const sinkLog = debug('ai:sink')
let logIndex = 0
const producerLog = () => debug(`ai:producer${logIndex++}`)

describe('[ pullCombine ]', () => {
  it('should work', async () => {
    const data0 = [0, 1, 2]
    const data1 = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pullCombine(
      pullProducer({ log: producerLog() })(data0),
      pullProducer({ log: producerLog() })(data1),
    )

    await w(r)

    assert.deepStrictEqual(spy.calls, [
      [{ value: [0, undefined], done: false }],
      [{ value: [0, 0], done: false }],
      [{ value: [1, 0], done: false }],
      [{ value: [1, 1], done: false }],
      [{ value: [2, 1], done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should work with no producers', async () => {
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pullCombine()

    await w(r)

    assert.deepStrictEqual(spy.calls, [[{ value: undefined, done: true }]])
  })

  it('should handle consumer delay', async () => {
    const data0 = [0, 1, 2, 3]
    const data1 = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog, delay: 50 })(spy)
    const r = pullCombine(
      pullProducer({ log: producerLog(), dataPrepareDelay: 4 })(data0),
      pullProducer({ log: producerLog(), dataPrepareDelay: 7 })(data1),
    )

    await w(r)

    assert.deepStrictEqual(spy.calls, [
      [{ value: [0, undefined], done: false }],
      [{ value: [0, 0], done: false }],
      [{ value: [1, 0], done: false }],
      [{ value: [1, 1], done: false }],
      [{ value: [2, 1], done: false }],
      [{ value: [3, 1], done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should propagate producer error to consumer', async () => {
    const data0 = [0, 1, 2, 3]
    const data1 = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pullCombine(
      pullProducer({ log: producerLog() })(data0),
      pullProducer({ log: producerLog(), errorAtStep: 1 })(data1),
    )

    try {
      await w(r)

      assert.fail('should not get here')
    } catch {
      /* drain producers */
      await wait(50)

      assert.deepStrictEqual(spy.calls, [
        [{ value: [0, undefined], done: false }],
        [{ value: [0, 0], done: false }],
        [{ value: [1, 0], done: false }],
      ])
    }
  })

  it('should propagate producer error to consumer and continue', async () => {
    const data0 = [0, 1, 2, 3]
    const data1 = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog, continueOnError: true })(spy)
    const r = pullCombine(
      pullProducer({ log: producerLog(), dataPrepareDelay: 4 })(data0),
      pullProducer({ log: producerLog(), dataPrepareDelay: 7, errorAtStep: 1 })(data1),
    )

    await w(r)

    assert.deepStrictEqual(spy.calls, [
      [{ value: [0, undefined], done: false }],
      [{ value: [0, 0], done: false }],
      [{ value: [1, 0], done: false }],
      [{ value: [2, 0], done: false }],
      [{ value: [3, 0], done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle producer crash', async () => {
    const data0 = [0, 1, 2, 3]
    const data1 = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pullCombine(
      pullProducer({ log: producerLog() })(data0),
      pullProducer({ log: producerLog(), crashAtStep: 1 })(data1),
    )

    try {
      await w(r)

      assert.fail('should not get here')
    } catch {
      /* drain producers */
      await wait(50)

      assert.deepStrictEqual(spy.calls, [
        [{ value: [0, undefined], done: false }],
        [{ value: [0, 0], done: false }],
      ])
    }
  })
})
