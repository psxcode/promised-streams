import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { debug } from './helpers/debug.ts'
import { fn } from './helpers/fn.ts'
import { waitTimePromise as wait } from '../src/internal.ts'
import { pullConsumer, pullProducer } from '../../promised-streams-test/src/index.ts'
import { pullDistinct } from '../src/index.ts'

const consumerLog = debug('ai:consumer')
const producerLog = () => debug(`ai:producer`)
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

describe('[ pullDistinct ]', () => {
  it('should work', async () => {
    const data = [0, 1, 1, 2, 3, 3, 3]
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pullProducer({ log: producerLog() })(data)
    const t = pullDistinct(notEqual)

    await w(t(r))

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
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pullProducer({ log: producerLog() })(data)
    const t = pullDistinct(asyncNotEqual)

    await w(t(r))

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
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pullProducer({ log: producerLog() })(data)
    const t = pullDistinct(
      (prev: number | undefined, next: number) => prev === undefined || next > prev,
    )

    await w(t(r))

    assert.deepStrictEqual(spy.calls, [
      [{ value: 3, done: false }],
      [{ value: 4, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should deliver predicate error to consumer', async () => {
    const data = [0, 1, 1, 2, 3, 3, 3]
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullDistinct(errorFn)
    const r = pullProducer({ log: producerLog })(data)

    try {
      await w(t(r))

      assert.fail('should not get here')
    } catch {
      assert.deepStrictEqual(spy.calls, [])
    }
  })

  it('should deliver producer error to consumer', async () => {
    const data = [0, 1, 1, 2, 3, 3, 3]
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pullProducer({ log: producerLog(), errorAtStep: 2 })(data)
    const t = pullDistinct(notEqual)

    try {
      await w(t(r))

      assert.fail('should not get here')
    } catch {
      assert.deepStrictEqual(spy.calls, [[{ value: 0, done: false }], [{ value: 1, done: false }]])
    }
  })

  it('should deliver producer error to consumer and continue', async () => {
    const data = [0, 1, 1, 2, 3, 3, 3]
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog, continueOnError: true })(spy)
    const r = pullProducer({ log: producerLog(), errorAtStep: 3 })(data)
    const t = pullDistinct(notEqual)

    await w(t(r))

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle producer crash', async () => {
    const data = [0, 1, 1, 2, 3, 3, 3]
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pullProducer({ log: producerLog(), crashAtStep: 2 })(data)
    const t = pullDistinct(notEqual)

    try {
      await w(t(r))

      assert.fail('should not get here')
    } catch {
      assert.deepStrictEqual(spy.calls, [[{ value: 0, done: false }], [{ value: 1, done: false }]])
    }
  })
})
