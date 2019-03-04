import { describe, it } from 'mocha'
import { expect } from 'chai'
import debug from 'debug'
import fn from 'test-fn'
import { waitTimePromise as wait } from '@psxcode/wait'
import { pullConsumer, pullProducer } from 'async-iterama-test/src'
import { pullFilter } from '../src'
import makeNumbers from './make-numbers'

const producerLog = debug('ai:producer')
const consumerLog = debug('ai:consumer')
const mapLog = debug('ai:filter')
const sinkLog = debug('ai:sink')
const isEven = (value: number) => {
  mapLog('filtering value')

  return value % 2 === 0
}

const asyncIsEven = async (value: number) => {
  mapLog('filtering value begin')
  await wait(50)
  mapLog('filtering value done')

  return value % 2 === 0
}

const errorFn = () => {
  throw new Error('error in predicate')
}


describe('[ pullFilter ]', () => {
  it('should work', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullFilter(isEven)
    const r = pullProducer({ log: producerLog })(data)

    await w(t(r))

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 2, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should work with async predicate', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullFilter(asyncIsEven)
    const r = pullProducer({ log: producerLog })(data)

    await w(t(r))

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 2, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should deliver predicate error to consumer', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullFilter(errorFn)
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
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullFilter(isEven)
    const r = pullProducer({ log: producerLog, errorAtStep: 2 })(data)

    try {
      await w(t(r))
    } catch {
      expect(spy.calls).deep.eq([
        [{ value: 0, done: false }],
      ])

      return
    }

    expect.fail('should not get here')
  })

  it('should deliver producer error to consumer and continue', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog, continueOnError: true })(spy)
    const t = pullFilter(isEven)
    const r = pullProducer({ log: producerLog, errorAtStep: 0 })(data)

    await w(t(r))

    expect(spy.calls).deep.eq([
      [{ value: 2, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle producer crash', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullFilter(isEven)
    const r = pullProducer({ log: producerLog, crashAtStep: 2 })(data)

    try {
      await w(t(r))
    } catch {
      expect(spy.calls).deep.eq([
        [{ value: 0, done: false }],
      ])

      return
    }

    expect.fail('should not get here')
  })
})
