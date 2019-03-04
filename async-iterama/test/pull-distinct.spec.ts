import { describe, it } from 'mocha'
import { expect } from 'chai'
import debug from 'debug'
import fn from 'test-fn'
import { waitTimePromise as wait } from '@psxcode/wait'
import { pullConsumer, pullProducer } from 'async-iterama-test/src'
import { pullDistinct } from '../src'

const consumerLog = debug('ai:consumer')
const producerLog = () => debug(`ai:producer`)
const mapLog = debug('ai:filter')
const sinkLog = debug('ai:sink')
const notEqual = (a: number, b: number) => {
  mapLog('filtering value')

  return a !== b
}

const asyncNotEqual = async (a: number, b: number) => {
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

    expect(spy.calls).deep.eq([
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

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
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
    } catch {

      expect(spy.calls).deep.eq([])

      return
    }

    expect.fail('should not get here')
  })

  it('should deliver producer error to consumer', async () => {
    const data = [0, 1, 1, 2, 3, 3, 3]
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pullProducer({ log: producerLog(), errorAtStep: 2 })(data)
    const t = pullDistinct(notEqual)

    try {
      await w(t(r))
    } catch {

      expect(spy.calls).deep.eq([
        [{ value: 0, done: false }],
        [{ value: 1, done: false }],
      ])

      return
    }

    expect.fail('should not get here')
  })

  it('should deliver producer error to consumer and continue', async () => {
    const data = [0, 1, 1, 2, 3, 3, 3]
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog, continueOnError: true })(spy)
    const r = pullProducer({ log: producerLog(), errorAtStep: 3 })(data)
    const t = pullDistinct(notEqual)

    await w(t(r))

    expect(spy.calls).deep.eq([
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
    } catch {

      expect(spy.calls).deep.eq([
        [{ value: 0, done: false }],
        [{ value: 1, done: false }],
      ])

      return
    }

    expect.fail('should not get here')
  })
})
