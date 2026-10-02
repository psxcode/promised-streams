import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { debug } from './helpers/debug.ts'
import { fn } from './helpers/fn.ts'
import { pushConsumer, pushProducer } from '../../promised-streams-test/src/index.ts'
import { pushFromIterable, pushZip } from '../src/index.ts'
import type { PushProducer } from '../src/index.ts'
import { makeNumbers } from './make-numbers.ts'

const consumerLog = debug('ai:consumer')
const sinkLog = debug('ai:sink')
let logIndex = 0
const producerLog = () => debug(`ai:producer${logIndex++}`)

/* forwards an error and returns without ever pushing a done chunk */
const errorThenStop: PushProducer<number> = async (consumer) => {
  await consumer(Promise.reject(new Error('boom')))
}

describe('[ pushZip ]', () => {
  it('should work', async () => {
    const data0 = [0, 1, 2, 3]
    const data1 = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const r = pushZip(
      pushProducer({ log: producerLog() })(data0),
      pushProducer({ log: producerLog() })(data1),
    )

    await r(w)

    assert.deepStrictEqual(spy.calls, [
      [{ value: [0, 0], done: false }],
      [{ value: [1, 1], done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should work with single producer', async () => {
    const data0 = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const r = pushZip(pushProducer({ log: producerLog() })(data0))

    await r(w)

    assert.deepStrictEqual(spy.calls, [
      [{ value: [0], done: false }],
      [{ value: [1], done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should work with no producers', async () => {
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const r = pushZip()

    await r(w)

    assert.deepStrictEqual(spy.calls, [[{ value: undefined, done: true }]])
  })

  it('should handle consumer delay', async () => {
    const data0 = [0, 1, 2, 3]
    const data1 = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, delay: 30 })(spy)
    const r = pushZip(
      pushProducer({ log: producerLog() })(data0),
      pushProducer({ log: producerLog() })(data1),
    )

    await r(w)

    assert.deepStrictEqual(spy.calls, [
      [{ value: [0, 0], done: false }],
      [{ value: [1, 1], done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle producer delay', async () => {
    const data0 = [0, 1, 2, 3]
    const data1 = makeNumbers(1)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, delay: 30 })(spy)
    const r = pushZip(
      pushProducer({ log: producerLog(), dataPrepareDelay: 50 })(data0),
      pushProducer({ log: producerLog() })(data1),
    )

    await r(w)

    assert.deepStrictEqual(spy.calls, [
      [{ value: [0, 0], done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should propagate consumer cancel to all producers', async () => {
    const data0 = [0, 1, 2, 3]
    const data1 = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, cancelAtStep: 0 })(spy)
    const r = pushZip(
      pushProducer({ log: producerLog() })(data0),
      pushProducer({ log: producerLog() })(data1),
    )

    await r(w)

    assert.deepStrictEqual(spy.calls, [[{ value: [0, 0], done: false }]])
  })

  it('should handle consumer crash', async () => {
    const data0 = [0, 1, 2, 3]
    const data1 = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, crashAtStep: 1 })(spy)
    const r = pushZip(
      pushProducer({ log: producerLog() })(data0),
      pushProducer({ log: producerLog() })(data1),
    )

    await r(w)

    assert.deepStrictEqual(spy.calls, [[{ value: [0, 0], done: false }]])
  })

  it('should handle consumer crash on complete', async () => {
    const data0 = [0]
    const data1 = makeNumbers(1)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, crashAtStep: 1 })(spy)
    const r = pushZip(
      pushProducer({ log: producerLog() })(data0),
      pushProducer({ log: producerLog() })(data1),
    )

    await r(w)

    assert.deepStrictEqual(spy.calls, [[{ value: [0, 0], done: false }]])
  })

  it('should propagate producer error to consumer', async () => {
    const data0 = [0, 1, 2, 3]
    const data1 = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const r = pushZip(
      pushProducer({ log: producerLog() })(data0),
      pushProducer({ log: producerLog(), errorAtStep: 0 })(data1),
    )

    await r(w)

    assert.deepStrictEqual(spy.calls, [])
  })

  it('should propagate producer error to consumer and continue', async () => {
    const data0 = [0, 1, 2, 3]
    const data1 = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, continueOnError: true })(spy)
    const r = pushZip(
      pushProducer({ log: producerLog() })(data0),
      pushProducer({ log: producerLog(), errorAtStep: 0 })(data1),
    )

    await r(w)

    assert.deepStrictEqual(spy.calls, [
      [{ value: [1, 1], done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should complete when a producer ends without a done chunk', async () => {
    const seen: unknown[] = []
    const r = pushZip(errorThenStop, pushFromIterable(makeNumbers(3)))

    await r(async (result) => {
      try {
        const ir = await result
        seen.push(ir.done ? 'DONE' : ir.value)
      } catch (e) {
        seen.push((e as Error).message)
      }
    })

    assert.deepStrictEqual(seen, ['boom', 'DONE'])
  })

  it('should complete with pushFromIterable sources of different length', async () => {
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const r = pushZip(pushFromIterable(makeNumbers(3)), pushFromIterable(makeNumbers(1)))

    await r(w)

    assert.deepStrictEqual(spy.calls, [
      [{ value: [0, 0], done: false }],
      [{ value: undefined, done: true }],
    ])
  })
})
