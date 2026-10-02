import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { debug } from './helpers/debug.ts'
import { fn } from './helpers/fn.ts'
import { pushConsumer, pushProducer } from '../../promised-streams-test/src/index.ts'
import { pushMerge, pushFromIterable } from '../src/index.ts'
import type { PushProducer } from '../src/index.ts'
import { makeNumbers } from './make-numbers.ts'
import { makeStrings } from './make-strings.ts'

const consumerLog = debug('ai:consumer')
const sinkLog = debug('ai:sink')
let logIndex = 0
const producerLog = () => debug(`ai:producer${logIndex++}`)

/* pushes a single value and returns, never sending a done chunk */
const stopsEarly: PushProducer<number> = async (consumer) => {
  await consumer(Promise.resolve({ value: 1, done: false }))
}

describe('[ pushMerge ]', () => {
  it('should work', async () => {
    const data0 = makeNumbers(2)
    const data1 = makeStrings(2)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const r = pushMerge(
      pushProducer({ log: producerLog() })(data0),
      pushProducer({ log: producerLog() })(data1),
    )

    await r(w)

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: '0', done: false }],
      [{ value: 1, done: false }],
      [{ value: '1', done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should work with single producer', async () => {
    const data0 = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const r = pushMerge(pushProducer({ log: producerLog() })(data0))

    await r(w)

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should work with no producers', async () => {
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const r = pushMerge()

    await r(w)

    assert.deepStrictEqual(spy.calls, [[{ value: undefined, done: true }]])
  })

  it('should handle consumer delay', async () => {
    const data0 = makeNumbers(2)
    const data1 = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, delay: 30 })(spy)
    const r = pushMerge(
      pushProducer({ log: producerLog() })(data0),
      pushProducer({ log: producerLog() })(data1),
    )

    await r(w)

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 1, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should propagate consumer cancel to all producers', async () => {
    const data0 = makeNumbers(4)
    const data1 = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, cancelAtStep: 0 })(spy)
    const r = pushMerge(
      pushProducer({ log: producerLog() })(data0),
      pushProducer({ log: producerLog() })(data1),
    )

    await r(w)

    assert.deepStrictEqual(spy.calls, [[{ value: 0, done: false }]])
  })

  it('should propagate consumer crash to all producers', async () => {
    const data0 = makeNumbers(4)
    const data1 = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, crashAtStep: 1 })(spy)
    const r = pushMerge(
      pushProducer({ log: producerLog() })(data0),
      pushProducer({ log: producerLog() })(data1),
    )

    await r(w)

    assert.deepStrictEqual(spy.calls, [[{ value: 0, done: false }]])
  })

  it('should propagate producer error to consumer', async () => {
    const data0 = makeNumbers(2)
    const data1 = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const r = pushMerge(
      pushProducer({ log: producerLog() })(data0),
      pushProducer({ log: producerLog(), errorAtStep: 0 })(data1),
    )

    await r(w)

    assert.deepStrictEqual(spy.calls, [[{ value: 0, done: false }]])
  })

  it('should propagate producer error to consumer and continue', async () => {
    const data0 = makeNumbers(2)
    const data1 = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, continueOnError: true })(spy)
    const r = pushMerge(
      pushProducer({ log: producerLog() })(data0),
      pushProducer({ log: producerLog(), errorAtStep: 0 })(data1),
    )

    await r(w)

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 1, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should deliver done when a producer stops without a done chunk', async () => {
    const seen: unknown[] = []
    const r = pushMerge(stopsEarly, pushFromIterable(makeNumbers(2)))

    await r(async (result) => {
      const ir = await result
      seen.push(ir.done ? 'DONE' : ir.value)
    })

    assert.deepStrictEqual(seen, [1, 0, 1, 'DONE'])
  })

  it('should deliver done when producers end with an error on complete', async () => {
    const data0 = makeNumbers(2)
    const data1 = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, continueOnError: true })(spy)
    const r = pushMerge(
      pushProducer({ log: producerLog(), errorAtStep: 2 })(data0),
      pushProducer({ log: producerLog(), errorAtStep: 2 })(data1),
    )

    await r(w)

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 1, done: false }],
      [{ value: undefined, done: true }],
    ])
  })
})
