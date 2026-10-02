import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { debug } from './helpers/debug.ts'
import { fn } from './helpers/fn.ts'
import { waitTimePromise as wait } from '../src/internal.ts'
import { pushConsumer, pushProducer } from '../../promised-streams-test/src/index.ts'
import { pushDebounceTime } from '../src/index.ts'
import { makeNumbers } from './make-numbers.ts'

const producerLog = debug('ai:producer')
const consumerLog = debug('ai:consumer')
const sinkLog = debug('ai:sink') as (arg: IteratorResult<number>) => void

describe('[ pushDebounceTime ]', () => {
  it('should work', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t = pushDebounceTime(10)
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))
    // await compose(r, t)(w)

    /* wait additional time to drain debounce */
    await wait(20)

    assert.deepStrictEqual(spy.calls, [
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle consumer cancel at final push', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, cancelAtStep: 0 })(spy)
    const t = pushDebounceTime(10)
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    /* wait additional time to drain debounce */
    await wait(20)

    assert.deepStrictEqual(spy.calls, [[{ value: 3, done: false }]])
  })

  it('should deliver consumer cancel', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, cancelAtStep: 0 })(spy)
    const t = pushDebounceTime(10)
    const r = pushProducer({ log: producerLog, dataPrepareDelay: 100 })(data)

    await r(t(w))

    /* wait additional time to drain debounce */
    await wait(20)

    assert.deepStrictEqual(spy.calls, [[{ value: 0, done: false }]])
  })

  it('should deliver consumer crash', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, crashAtStep: 1 })(spy)
    const t = pushDebounceTime(10)
    const r = pushProducer({ log: producerLog, dataPrepareDelay: 100 })(data)

    await r(t(w))

    /* wait additional time to drain debounce */
    await wait(20)

    assert.deepStrictEqual(spy.calls, [[{ value: 0, done: false }]])
  })

  it('should deliver producer error to consumer', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t = pushDebounceTime(10)
    const r = pushProducer({ log: producerLog, errorAtStep: 1, dataPrepareDelay: 50 })(data)

    await r(t(w))

    /* wait additional time to drain debounce */
    await wait(20)

    assert.deepStrictEqual(spy.calls, [[{ value: 0, done: false }]])
  })
})
