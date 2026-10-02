import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { debug } from './helpers/debug.ts'
import { fn } from './helpers/fn.ts'
import { pullConsumer, pullProducer } from '../../promised-streams-test/src/index.ts'
import { waitTimePromise as wait } from '../src/internal.ts'
import { pullWithLatest } from '../src/index.ts'
import { makeNumbers } from './make-numbers.ts'

const consumerLog = debug('ai:consumer')
const sinkLog = debug('ai:sink')
let logIndex = 0
const producerLog = () => debug(`ai:producer${logIndex++}`)
const mainProducerLog = () => debug(`ai:main-producer`)

describe('[ pullWithLatest ]', () => {
  it('should work', async () => {
    const data0 = [0, 1, 2, 3]
    const data1 = makeNumbers(2)
    const dataMain = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pullWithLatest(
      pullProducer({ log: producerLog() })(data0),
      pullProducer({ log: producerLog() })(data1),
    )(pullProducer({ log: mainProducerLog(), dataPrepareDelay: 10 })(dataMain))

    await w(r)

    assert.deepStrictEqual(spy.calls, [
      [{ value: [0, 3, 1], done: false }],
      [{ value: [1, 3, 1], done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should work with only main producer', async () => {
    const data0 = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pullWithLatest()(pullProducer({ log: mainProducerLog() })(data0))

    await w(r)

    assert.deepStrictEqual(spy.calls, [
      [{ value: [0], done: false }],
      [{ value: [1], done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle consumer delay', async () => {
    const data0 = [0, 1, 2, 3]
    const data1 = makeNumbers(2)
    const dataMain = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog, delay: 50 })(spy)
    const r = pullWithLatest(
      pullProducer({ log: producerLog(), dataPrepareDelay: 7 })(data0),
      pullProducer({ log: producerLog(), dataPrepareDelay: 7 })(data1),
    )(pullProducer({ log: mainProducerLog(), dataPrepareDelay: 10 })(dataMain))

    await w(r)

    assert.deepStrictEqual(spy.calls, [
      [{ value: [0, 0, 0], done: false }],
      [{ value: [1, 3, 1], done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should propagate producer error to consumer', async () => {
    const data0 = [0, 1, 2, 3]
    const data1 = makeNumbers(2)
    const dataMain = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pullWithLatest(
      pullProducer({ log: producerLog() })(data0),
      pullProducer({ log: producerLog(), errorAtStep: 0 })(data1),
    )(pullProducer({ log: mainProducerLog(), dataPrepareDelay: 10 })(dataMain))

    try {
      await w(r)
      assert.fail('should not get here')
    } catch {
      /* drain producers */
      await wait(50)

      assert.deepStrictEqual(spy.calls, [[{ value: [0, 3, undefined], done: false }]])
    }
  })

  it('should propagate main producer error to consumer', async () => {
    const data0 = [0, 1, 2, 3]
    const data1 = makeNumbers(2)
    const dataMain = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pullWithLatest(
      pullProducer({ log: producerLog() })(data0),
      pullProducer({ log: producerLog() })(data1),
    )(pullProducer({ log: mainProducerLog(), errorAtStep: 0, dataPrepareDelay: 10 })(dataMain))

    try {
      await w(r)
      assert.fail('should not get here')
    } catch {
      /* drain producers */
      await wait(50)

      assert.deepStrictEqual(spy.calls, [])
    }
  })

  it('should propagate producer error to consumer and continue', async () => {
    const data0 = [0, 1, 2, 3]
    const data1 = makeNumbers(2)
    const dataMain = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog, continueOnError: true })(spy)
    const r = pullWithLatest(
      pullProducer({ log: producerLog() })(data0),
      pullProducer({ log: producerLog(), errorAtStep: 0 })(data1),
    )(pullProducer({ log: mainProducerLog(), dataPrepareDelay: 10 })(dataMain))

    await w(r)

    assert.deepStrictEqual(spy.calls, [
      [{ value: [0, 3, undefined], done: false }],
      [{ value: [1, 3, undefined], done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle producer crash', async () => {
    const data0 = [0, 1, 2, 3]
    const data1 = makeNumbers(2)
    const dataMain = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pullWithLatest(
      pullProducer({ log: producerLog() })(data0),
      pullProducer({ log: producerLog(), crashAtStep: 0 })(data1),
    )(pullProducer({ log: mainProducerLog(), dataPrepareDelay: 10 })(dataMain))

    try {
      await w(r)
      assert.fail('should not get here')
    } catch {
      /* drain producers */
      await wait(50)

      assert.deepStrictEqual(spy.calls, [[{ value: [0, 3, undefined], done: false }]])
    }
  })

  it('should handle main producer crash', async () => {
    const data0 = [0, 1, 2, 3]
    const data1 = makeNumbers(2)
    const dataMain = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pullWithLatest(
      pullProducer({ log: producerLog() })(data0),
      pullProducer({ log: producerLog() })(data1),
    )(pullProducer({ log: mainProducerLog(), crashAtStep: 0, dataPrepareDelay: 10 })(dataMain))

    try {
      await w(r)

      assert.fail('should not get here')
    } catch {
      /* drain producers */
      await wait(50)

      assert.deepStrictEqual(spy.calls, [])
    }
  })
})
