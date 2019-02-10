import { describe, it } from 'mocha'
import { expect } from 'chai'
import debug from 'debug'
import fn from 'test-fn'
import { pushIterable, pushIterableAsync, pullIterable, pullIterableAsync } from '../src/from-iterable'
import makeNumbers from './make-numbers'
import pushConsumer from './push-consumer'
import asyncPushConsumer from './async-push-consumer'
import pullConsumer from './pull-consumer'
import asyncPullConsumer from './async-pull-consumer'

const consumerLog = debug('ai:consumer')
const sinkLog = debug('ai:sink')

describe('[ from-iterable ]', () => {
  describe('[ pushProducer ]', () => {
    it('should work', async () => {
      const data = makeNumbers(4)
      const spy = fn(sinkLog)
      const w = pushConsumer({ log: consumerLog })(spy)
      const r = pushIterable(data)

      r(w)

      expect(spy.calls).deep.eq([
        [0], [1], [2], [3],
      ])
    })
  })

  describe('[ asyncPushProducer ]', () => {
    it('should work', async () => {
      const data = makeNumbers(4)
      const spy = fn(sinkLog)
      const w = asyncPushConsumer({ log: consumerLog, delay: 10 })(spy)
      const r = pushIterableAsync(data)

      await r(w)

      expect(spy.calls).deep.eq([
        [0], [1], [2], [3],
      ])
    })
  })

  describe('[ pullIterable ]', () => {
    it('should work', async () => {
      const data = makeNumbers(4)
      const spy = fn(sinkLog)
      const w = pullConsumer({ log: consumerLog })(spy)
      const r = pullIterable(data)

      w(r)

      expect(spy.calls).deep.eq([
        [0], [1], [2], [3],
      ])
    })
  })

  describe('[ asyncPullIterable ]', () => {
    it('should work', async () => {
      const data = makeNumbers(4)
      const spy = fn(sinkLog)
      const w = asyncPullConsumer({ log: consumerLog, delay: 10 })(spy)
      const r = pullIterableAsync(data)

      await w(r)

      expect(spy.calls).deep.eq([
        [0], [1], [2], [3],
      ])
    })
  })
})
