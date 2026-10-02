import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { debug } from './helpers/debug.ts'
import { fn } from './helpers/fn.ts'
import { pullConsumer } from '../../promised-streams-test/src/index.ts'
import { readable } from './helpers/readable.ts'
import { pullFromStream, pullZip } from '../src/index.ts'
import { makeNumbers } from './make-numbers.ts'

const producerLog = debug('ai:producer')
const consumerLog = debug('ai:consumer')
const sinkLog = debug('ai:sink')

describe('[ pullFromStream ]', () => {
  it('should work', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pullFromStream(
      readable({ log: producerLog, eager: true })({ objectMode: true })(data),
    )

    await w(r)

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('slow stream', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pullFromStream(
      readable({ log: producerLog, eager: false, delayMs: 50 })({ objectMode: true })(data),
    )

    await w(r)

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('slow consumer', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog, delay: 50 })(spy)
    const r = pullFromStream(
      readable({ log: producerLog, eager: false })({ objectMode: true })(data),
    )

    await w(r)

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('error handling - consumer break / stream break', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pullFromStream(
      readable({ log: producerLog, eager: true, errorAtStep: 2 })({ objectMode: true })(data),
    )

    try {
      await w(r)

      assert.fail('should not get here')
    } catch {
      /* stream does not deliver data immediately, but error does */
      assert.deepStrictEqual(spy.calls, [])
    }
  })

  it('error handling - consumer break / stream continue', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pullFromStream(
      readable({ log: producerLog, eager: true, errorAtStep: 2, continueOnError: true })({
        objectMode: true,
      })(data),
    )

    try {
      await w(r)

      assert.fail('shoudl not get here')
    } catch {
      /* stream does not deliver data immediately, but error does */
      assert.deepStrictEqual(spy.calls, [])
    }
  })

  it('error handling - consumer continue / stream break', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog, continueOnError: true })(spy)
    const r = pullFromStream(
      readable({ log: producerLog, eager: true, errorAtStep: 2 })({ objectMode: true })(data),
    )

    await w(r)

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('error handling - consumer continue / stream continue', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog, continueOnError: true })(spy)
    const r = pullFromStream(
      readable({ log: producerLog, eager: true, errorAtStep: 2, continueOnError: true })({
        objectMode: true,
      })(data),
    )

    await w(r)

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should support concurrent pulls', async () => {
    const data = makeNumbers(3)
    const r = pullFromStream(
      readable({ log: producerLog, eager: true })({ objectMode: true })(data),
    )

    assert.deepStrictEqual(await Promise.all([r(), r()]), [
      { value: 0, done: false },
      { value: 1, done: false },
    ])
  })

  it('should support concurrent pulls by composition operators', async () => {
    const data = makeNumbers(4)
    const r = pullFromStream(
      readable({ log: producerLog, eager: true })({ objectMode: true })(data),
    )
    const zipped = pullZip(r, r)

    assert.deepStrictEqual(await zipped(), { value: [0, 1], done: false })
    assert.deepStrictEqual(await zipped(), { value: [2, 3], done: false })
    assert.deepStrictEqual(await zipped(), { value: undefined, done: true })
  })
})
