import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { debug } from './helpers/debug.ts'
import { fn } from './helpers/fn.ts'
import { waitTimePromise as wait } from '../src/internal.ts'
import { pullConsumer, pullProducer } from '../../promised-streams-test/src/index.ts'
import { pullDo } from '../src/index.ts'
import { makeNumbers } from './make-numbers.ts'

const producerLog = debug('ai:producer')
const consumerLog = debug('ai:consumer')
const doLog = debug('ai:do')
const sinkLog = debug('ai:sink')
const doFunc = (value: number) => {
  doLog(`got the value ${value}`)
}

const asyncDoFunc = async (value: number) => {
  doLog(`getting value begin ${value}`)
  await wait(50)
  doLog('getting value done')
}

const errorDoFunc = () => {
  throw new Error('error')
}

describe('[ pullDo ]', () => {
  it('should work', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const doSpy = fn(doFunc)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullDo(doSpy)
    const r = pullProducer({ log: producerLog })(data)

    await w(t(r))

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
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullDo(doSpy)
    const r = pullProducer({ log: producerLog })(data)

    await w(t(r))

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])

    assert.deepStrictEqual(doSpy.calls, [[0], [1], [2], [3]])
  })

  it('should not deliver dofunc error to consumer', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullDo(errorDoFunc)
    const r = pullProducer({ log: producerLog })(data)

    await w(t(r))

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should deliver producer error to consumer', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const doSpy = fn(doFunc)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullDo(doSpy)
    const r = pullProducer({ log: producerLog, errorAtStep: 2 })(data)

    try {
      await w(t(r))

      assert.fail('should not get here')
    } catch {
      assert.deepStrictEqual(spy.calls, [[{ value: 0, done: false }], [{ value: 1, done: false }]])

      assert.deepStrictEqual(doSpy.calls, [[0], [1]])
    }
  })

  it('should deliver producer error to consumer and continue', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const doSpy = fn(doFunc)
    const w = pullConsumer({ log: consumerLog, continueOnError: true })(spy)
    const t = pullDo(doSpy)
    const r = pullProducer({ log: producerLog, errorAtStep: 2 })(data)

    await w(t(r))

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])

    assert.deepStrictEqual(doSpy.calls, [[0], [1], [3]])
  })

  it('should handle producer crash', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const doSpy = fn(doFunc)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullDo(doSpy)
    const r = pullProducer({ log: producerLog, crashAtStep: 2 })(data)

    try {
      await w(t(r))

      assert.fail('should not get here')
    } catch {
      assert.deepStrictEqual(spy.calls, [[{ value: 0, done: false }], [{ value: 1, done: false }]])

      assert.deepStrictEqual(doSpy.calls, [[0], [1]])
    }
  })
})
