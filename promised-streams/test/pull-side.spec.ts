import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { debug } from './helpers/debug.ts'
import { fn } from './helpers/fn.ts'
import { waitTimePromise as wait } from '../src/internal.ts'
import { pullConsumer, pullProducer } from '../../promised-streams-test/src/index.ts'
import { pullSide } from '../src/index.ts'
import { makeNumbers } from './make-numbers.ts'

const producerLog = debug('ai:producer')
const consumerLog = debug('ai:consumer')
const mapLog = debug('ai:side-effect')
const sinkLog = debug('ai:sink')
const sideFn = () => {
  mapLog('side effect')
}

const asyncSideFn = async () => {
  mapLog('side effect begin')
  await wait(50)
  mapLog('side effect done')
}

const errorFn = () => {
  throw new Error('error in mapper')
}

describe('[ pullSide ]', () => {
  it('should work', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const sideSpy = fn(sideFn)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullSide(sideSpy)
    const r = pullProducer({ log: producerLog })(data)

    await w(t(r))

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])

    assert.deepStrictEqual(sideSpy.calls, [[0], [1], [2], [3]])
  })

  it('should work with async sideFn', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const sideSpy = fn(asyncSideFn)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullSide(sideSpy)
    const r = pullProducer({ log: producerLog })(data)

    await w(t(r))

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])

    assert.deepStrictEqual(sideSpy.calls, [[0], [1], [2], [3]])
  })

  it('should deliver side-effect function error to consumer', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const sideSpy = fn(errorFn)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullSide(sideSpy)
    const r = pullProducer({ log: producerLog, errorAtStep: 2 })(data)

    try {
      await w(t(r))
      assert.fail('should not get here')
    } catch {
      assert.deepStrictEqual(spy.calls, [])
      assert.deepStrictEqual(sideSpy.calls, [[0]])
    }
  })

  it('should deliver producer error to consumer', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const sideSpy = fn(sideFn)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullSide(sideSpy)
    const r = pullProducer({ log: producerLog, errorAtStep: 2 })(data)

    try {
      await w(t(r))
      assert.fail('should not get here')
    } catch {
      assert.deepStrictEqual(spy.calls, [[{ value: 0, done: false }], [{ value: 1, done: false }]])

      assert.deepStrictEqual(sideSpy.calls, [[0], [1]])
    }
  })

  it('should deliver producer error to consumer and continue', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const sideSpy = fn(sideFn)
    const w = pullConsumer({ log: consumerLog, continueOnError: true })(spy)
    const t = pullSide(sideSpy)
    const r = pullProducer({ log: producerLog, errorAtStep: 2 })(data)

    await w(t(r))

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])

    assert.deepStrictEqual(sideSpy.calls, [[0], [1], [3]])
  })

  it('should handle producer crash', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const sideSpy = fn(sideFn)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullSide(sideSpy)
    const r = pullProducer({ log: producerLog, crashAtStep: 2 })(data)

    try {
      await w(t(r))
      assert.fail('should not get here')
    } catch {
      assert.deepStrictEqual(spy.calls, [[{ value: 0, done: false }], [{ value: 1, done: false }]])

      assert.deepStrictEqual(sideSpy.calls, [[0], [1]])
    }
  })
})
