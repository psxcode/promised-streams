import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { debug } from './helpers/debug.ts'
import { fn } from './helpers/fn.ts'
import { pushConsumer } from '../../promised-streams-test/src/index.ts'
import { pushFromIterable, pushTake } from '../src/index.ts'
import { makeNumbers } from './make-numbers.ts'

const consumerLog = debug('ai:consumer')
const sinkLog = debug('ai:sink')

describe('[ pushIterable ]', () => {
  it('should work', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, delay: 10 })(spy)
    const r = pushFromIterable(data)

    await r(w)

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should deliver consumer cancel', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, cancelAtStep: 1 })(spy)
    const r = pushFromIterable(data)

    /* must resolve, not reject: consumer cancel is not a producer failure */
    await r(w)

    assert.deepStrictEqual(spy.calls, [[{ value: 0, done: false }], [{ value: 1, done: false }]])
  })

  it('should handle consumer crash', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, crashAtStep: 1 })(spy)
    const r = pushFromIterable(data)

    await r(w)

    assert.deepStrictEqual(spy.calls, [[{ value: 0, done: false }]])
  })

  it('should survive an operator that cancels the consumer', async () => {
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const r = pushFromIterable(makeNumbers(4))

    /* pushTake(2) cancels the consumer on overflow by rejecting it */
    await r(pushTake(2)(w))

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: undefined, done: true }],
    ])
  })
})
