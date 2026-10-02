import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { debug } from './helpers/debug.ts'
import { fn } from './helpers/fn.ts'
import { pushConsumer, pushProducer } from '../../promised-streams-test/src/index.ts'
import { pushTake } from '../src/index.ts'
import type { PushConsumer } from '../src/index.ts'
import { makeNumbers } from './make-numbers.ts'

const producerLog = debug('ai:producer')
const consumerLog = debug('ai:consumer')
const sinkLog = debug('ai:sink')

describe('[ pushTake ]', () => {
  it('should work with positive numbers', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t = pushTake(2)
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should work with positive overflow numbers', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t = pushTake(10)
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should work with negative numbers', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t = pushTake(-2)
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    assert.deepStrictEqual(spy.calls, [
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should work with negative overflow numbers', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t = pushTake(-10)
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should work with 0 take', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t = pushTake(0)
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    assert.deepStrictEqual(spy.calls, [[{ value: undefined, done: true }]])
  })

  it('should deliver cancel to producer', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, cancelAtStep: 1 })(spy)
    const t = pushTake(3)
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    assert.deepStrictEqual(spy.calls, [[{ value: 0, done: false }], [{ value: 1, done: false }]])
  })

  it('should deliver cancel to producer on complete', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, cancelAtStep: 2 })(spy)
    const t = pushTake(2)
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should deliver cancel to producer on negative', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, cancelAtStep: 1 })(spy)
    const t = pushTake(-2)
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    assert.deepStrictEqual(spy.calls, [[{ value: 2, done: false }], [{ value: 3, done: false }]])
  })

  it('should deliver cancel on negative on complete to producer', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, cancelAtStep: 2 })(spy)
    const t = pushTake(-2)
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    assert.deepStrictEqual(spy.calls, [
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle consumer crash', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, crashAtStep: 1 })(spy)
    const t = pushTake(3)
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    assert.deepStrictEqual(spy.calls, [[{ value: 0, done: false }]])
  })

  it('should handle consumer crash on complete', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, crashAtStep: 2 })(spy)
    const t = pushTake(2)
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    assert.deepStrictEqual(spy.calls, [[{ value: 0, done: false }], [{ value: 1, done: false }]])
  })

  it('should handle consumer crash on negative', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, crashAtStep: 1 })(spy)
    const t = pushTake(-2)
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    assert.deepStrictEqual(spy.calls, [[{ value: 2, done: false }]])
  })

  it('should handle consumer crash on negative on complete', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, crashAtStep: 2 })(spy)
    const t = pushTake(-2)
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    assert.deepStrictEqual(spy.calls, [[{ value: 2, done: false }], [{ value: 3, done: false }]])
  })

  it('should deliver producer error to consumer', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t = pushTake(2)
    const r = pushProducer({ log: producerLog, errorAtStep: 1 })(data)

    await r(t(w))

    assert.deepStrictEqual(spy.calls, [[{ value: 0, done: false }]])
  })

  it('should NOT deliver producer error to consumer on complete', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t = pushTake(2)
    const r = pushProducer({ log: producerLog, errorAtStep: 2 })(data)

    await r(t(w))

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should skip producer error', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t = pushTake(2)
    const r = pushProducer({ log: producerLog, errorAtStep: 3 })(data)

    await r(t(w))

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should deliver producer error to consumer on negative', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t = pushTake(-2)
    const r = pushProducer({ log: producerLog, errorAtStep: 3 })(data)

    await r(t(w))

    assert.deepStrictEqual(spy.calls, [[{ value: 2, done: false }]])
  })

  it('should flush buffered values before producer error on negative on complete', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t = pushTake(-2)
    const r = pushProducer({ log: producerLog, errorAtStep: 4 })(data)

    await r(t(w))

    /* the error is the last chunk, so the last buffered value is delivered first */
    assert.deepStrictEqual(spy.calls, [[{ value: 3, done: false }]])
  })

  it('should terminate on producer error before the buffer is filled on negative', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t = pushTake(-2)
    const r = pushProducer({ log: producerLog, errorAtStep: 0 })(data)

    await r(t(w))

    /* the error ends the stream before any value was buffered */
    assert.deepStrictEqual(spy.calls, [])
  })

  it('should deliver error to consumer and continue', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, continueOnError: true })(spy)
    const t = pushTake(2)
    const r = pushProducer({ log: producerLog, errorAtStep: 0 })(data)

    await r(t(w))

    assert.deepStrictEqual(spy.calls, [
      [{ value: 1, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should deliver error to consumer and continue on negative', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, continueOnError: true })(spy)
    const t = pushTake(-2)
    const r = pushProducer({ log: producerLog, errorAtStep: 2 })(data)

    await r(t(w))

    assert.deepStrictEqual(spy.calls, [
      [{ value: 1, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should deliver producer error to consumer on negative on complete', async () => {
    const data = makeNumbers(4)
    const values: IteratorResult<number>[] = []
    const errors: unknown[] = []
    const w: PushConsumer<number> = async (result) => {
      try {
        values.push(await result)
      } catch (e) {
        errors.push(e)

        throw e
      }
    }
    const t = pushTake(-2)
    const r = pushProducer({ log: producerLog, errorAtStep: 4 })(data)

    await r(t(w))

    assert.deepStrictEqual(values, [{ value: 3, done: false }])
    assert.deepStrictEqual(errors, [new Error('error at complete')])
  })
})
