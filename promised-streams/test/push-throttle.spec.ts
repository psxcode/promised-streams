import { describe, it } from 'mocha'
import { expect } from 'chai'
import debug from 'debug'
import fn from 'test-fn'
import { waitTime, waitTimePromise as wait } from '@psxcode/wait'
import { pushConsumer, pushProducer } from 'promised-streams-test/src'
import { pushThrottle } from '../src'
import { makeNumbers } from './make-numbers'

const producerLog = debug('ai:producer')
const consumerLog = debug('ai:consumer')
const sinkLog = debug('ai:sink') as (arg: IteratorResult<number>) => void
const debLog = debug('ai:wait')
const debWait = (ms: number) => (cb: any) => {
  debLog(`debouncing for ${ms}ms`)

  return waitTime(cb)(ms)
}

describe('[ pushThrottle ]', () => {
  it('should work', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t = pushThrottle(debWait(10))
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    /* wait additional time to drain throttle */
    await wait(20)

    expect(spy.calls).deep.eq([
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle consumer cancel at final push', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, cancelAtStep: 0 })(spy)
    const t = pushThrottle(debWait(10))
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    /* wait additional time to drain throttle */
    await wait(20)

    expect(spy.calls).deep.eq([
      [{ value: 3, done: false }],
    ])
  })

  it('should handle immediate done', async () => {
    const data: number[] = []
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t = pushThrottle(debWait(10))
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    /* wait additional time to drain throttle */
    await wait(20)

    expect(spy.calls).deep.eq([
      [{ value: undefined, done: true }],
    ])
  })

  it('should deliver consumer cancel', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, cancelAtStep: 0 })(spy)
    const t = pushThrottle(debWait(10))
    const r = pushProducer({ log: producerLog, dataPrepareDelay: 100 })(data)

    await r(t(w))

    /* wait additional time to drain throttle */
    await wait(20)

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
    ])
  })

  it('should handle consumer crash', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, crashAtStep: 1 })(spy)
    const t = pushThrottle(debWait(10))
    const r = pushProducer({ log: producerLog, dataPrepareDelay: 100 })(data)

    await r(t(w))

    /* wait additional time to drain throttle */
    await wait(20)

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
    ])
  })

  it('should handle consumer crash on complete', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, crashAtStep: 3 })(spy)
    const t = pushThrottle(debWait(10))
    const r = pushProducer({ log: producerLog, dataPrepareDelay: 100 })(data)

    await r(t(w))

    /* wait additional time to drain throttle */
    await wait(20)

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
    ])
  })

  it('should deliver producer error to consumer', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t = pushThrottle(debWait(10))
    const r = pushProducer({ log: producerLog, errorAtStep: 1, dataPrepareDelay: 50 })(data)

    await r(t(w))

    /* wait additional time to drain throttle */
    await wait(20)

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
    ])
  })

  it('should be able to continue after producer error', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, continueOnError: true })(spy)
    const t = pushThrottle(debWait(10))
    const r = pushProducer({ log: producerLog, errorAtStep: 1, dataPrepareDelay: 50 })(data)

    await r(t(w))

    /* wait additional time to drain throttle */
    await wait(20)

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })
})
