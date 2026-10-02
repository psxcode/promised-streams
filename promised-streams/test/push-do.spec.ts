import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { debug } from './helpers/debug.ts'
import { fn } from './helpers/fn.ts'
import { waitTimePromise as wait } from '../src/internal.ts'
import { pushConsumer, pushProducer } from '../../promised-streams-test/src/index.ts'
import { pushDo } from '../src/index.ts'
import { makeNumbers } from './make-numbers.ts'

const producerLog = debug('ai:producer')
const consumerLog = debug('ai:consumer')
const mapLog = debug('ai:map')
const sinkLog = debug('ai:sink')
const doFunc = (value: number) => {
  mapLog(`got value ${value}`)
}

const asyncDoFunc = async (value: number) => {
  mapLog(`getting value begin ${value}`)
  await wait(50)
  mapLog(`getting value done ${value}`)
}

const errorDoFunc = () => {
  throw new Error('error')
}

describe('[ pushDo ]', () => {
  it('should work', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const doSpy = fn(doFunc)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t = pushDo(doSpy)
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])

    assert.deepStrictEqual(doSpy.calls, [[0], [1], [2], [3]])
  })

  it('should work with async dofunc', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const doSpy = fn(asyncDoFunc)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t = pushDo(doSpy)
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])

    assert.deepStrictEqual(doSpy.calls, [[0], [1], [2], [3]])
  })

  it('should deliver consumer cancel', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const doSpy = fn(doFunc)
    const w = pushConsumer({ log: consumerLog, cancelAtStep: 1 })(spy)
    const t = pushDo(doSpy)
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    assert.deepStrictEqual(spy.calls, [[{ value: 0, done: false }], [{ value: 1, done: false }]])

    assert.deepStrictEqual(doSpy.calls, [[0], [1]])
  })

  it('should handle consumer crash', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const doSpy = fn(doFunc)
    const w = pushConsumer({ log: consumerLog, crashAtStep: 1 })(spy)
    const t = pushDo(doSpy)
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    assert.deepStrictEqual(spy.calls, [[{ value: 0, done: false }]])

    assert.deepStrictEqual(doSpy.calls, [[0], [1]])
  })

  it('should deliver producer error to consumer', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const doSpy = fn(doFunc)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t = pushDo(doSpy)
    const r = pushProducer({ log: producerLog, errorAtStep: 2 })(data)

    await r(t(w))

    assert.deepStrictEqual(spy.calls, [[{ value: 0, done: false }], [{ value: 1, done: false }]])

    assert.deepStrictEqual(doSpy.calls, [[0], [1]])
  })

  it('should not deliver dofunc error to consumer', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t = pushDo(errorDoFunc)
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
})
