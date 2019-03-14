import { describe, it } from 'mocha'
import { expect } from 'chai'
import debug from 'debug'
import fn from 'test-fn'
import { pullConsumer } from 'async-iterama-test/src'
import { pullFromIterable } from '../src'
import makeNumbers from './make-numbers'

const consumerLog = debug('ai:consumer')
const sinkLog = debug('ai:sink')

describe('[ pullIterable ]', () => {
  it('should work', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog, delay: 10 })(spy)
    const r = pullFromIterable(data)

    await w(r)

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it.only('should work', async () => {
    async function sleep (ms: number): Promise<void> {
      return new Promise<void>((resolve) => {
        setTimeout(resolve, ms)
      })
    }

    type A = AsyncIterableIterator

    async function* asyncGenerator () {
      yield 1
      await sleep(1000)
      yield 2
    }

    (async () => {
      for await (const num of asyncGenerator()) {
        console.log(num)
      }
    })().catch((e) => console.error(e))
  })
})
