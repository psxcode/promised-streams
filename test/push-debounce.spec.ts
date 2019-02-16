import { describe, it } from 'mocha'
import { expect } from 'chai'
import debug from 'debug'
import fn from 'test-fn'
import { waitTime, waitTimePromise as wait } from '@psxcode/wait'
import { pushDebounce } from '../src'
import makeNumbers from './make-numbers'
import pushConsumer from './push-consumer'
import pushProducer from './push-producer'

const producerLog = debug('ai:producer')
const consumerLog = debug('ai:consumer')
const sinkLog = debug('ai:sink') as (arg: IteratorResult<number>) => void
const debLog = debug('ai:wait')
const debWait = (ms: number) => (cb) => {
  debLog(`debouncing for ${ms}ms`)

  return waitTime(cb)(ms)
}

describe('[ pushDebounce ]', () => {
  it('should work', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t = pushDebounce(debWait(10))
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))
    // await compose(r, t)(w)

    /* wait additional time to drain debounce */
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
    const t = pushDebounce(debWait(10))
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))
    // await compose(r, t)(w)

    /* wait additional time to drain debounce */
    await wait(20)

    expect(spy.calls).deep.eq([
      [{ value: 3, done: false }],
    ])
  })

  it('should deliver consumer cancel', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, cancelAtStep: 0 })(spy)
    const t = pushDebounce(debWait(10))
    const r = pushProducer({ log: producerLog, dataPrepareDelay: 100 })(data)

    try {
      await r(t(w))
    } catch {

      expect(spy.calls).deep.eq([
        [{ value: 0, done: false }],
      ])

      return
    }

    expect.fail('should not get here')
  })
})
