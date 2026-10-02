import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { debug } from './helpers/debug.ts'
import { fn } from './helpers/fn.ts'
import { waitTimePromise as wait } from '../src/internal.ts'
import { pushConsumer, pushProducer } from '../../promised-streams-test/src/index.ts'
import { pushDistinct } from '../src/index.ts'

const producerLog = debug('ai:producer')
const consumerLog = debug('ai:consumer')
const mapLog = debug('ai:filter')
const sinkLog = debug('ai:sink')
const notEqual = (a: number | undefined, b: number) => {
  mapLog('filtering value')

  return a !== b
}

const asyncNotEqual = async (a: number | undefined, b: number) => {
  mapLog('filtering value begin')
  await wait(50)
  mapLog('filtering value done')

  return a !== b
}

const errorFn = () => {
  throw new Error('error in predicate')
}

describe('[ pushDistinct ]', () => {
  it('should work', async () => {
    const data = [0, 1, 1, 2, 3, 3, 3]
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t = pushDistinct(notEqual)
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

  it('should work with async predicate', async () => {
    const data = [0, 1, 1, 2, 3, 3, 3]
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t = pushDistinct(asyncNotEqual)
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

  it('should pass the previous value to isAllowed', async () => {
    const data = [3, 1, 2, 4]
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t = pushDistinct(
      (prev: number | undefined, next: number) => prev === undefined || next > prev,
    )
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    assert.deepStrictEqual(spy.calls, [
      [{ value: 3, done: false }],
      [{ value: 4, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should deliver consumer cancel', async () => {
    const data = [0, 1, 1, 2, 3, 3, 3]
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, cancelAtStep: 1 })(spy)
    const t = pushDistinct(notEqual)
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    assert.deepStrictEqual(spy.calls, [[{ value: 0, done: false }], [{ value: 1, done: false }]])
  })

  it('should handle consumer crash', async () => {
    const data = [0, 1, 1, 2, 3, 3, 3]
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, crashAtStep: 1 })(spy)
    const t = pushDistinct(notEqual)
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    assert.deepStrictEqual(spy.calls, [[{ value: 0, done: false }]])
  })

  it('should deliver producer error to consumer', async () => {
    const data = [0, 1, 1, 2, 3, 3, 3]
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t = pushDistinct(notEqual)
    const r = pushProducer({ log: producerLog, errorAtStep: 2 })(data)

    await r(t(w))

    assert.deepStrictEqual(spy.calls, [[{ value: 0, done: false }], [{ value: 1, done: false }]])
  })

  it('should deliver predicate error to consumer', async () => {
    const data = [0, 1, 1, 2, 3, 3, 3]
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t = pushDistinct(errorFn)
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    assert.deepStrictEqual(spy.calls, [])
  })
})
