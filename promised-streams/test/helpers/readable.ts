import { Readable } from 'node:stream'
import type { ReadableOptions } from 'node:stream'
import { iterate, waitTime } from '../../src/internal.ts'

type Logger = (...args: unknown[]) => void

const noop: Logger = () => {}

const isPositive = (num?: number): num is number =>
  num !== undefined && Number.isFinite(num) && num >= 0

export type MakeReadableOptions = {
  log?: Logger
  errorAtStep?: number
  continueOnError?: boolean
  delayMs?: number
  eager: boolean
}

export const readable =
  ({ log = noop, errorAtStep, continueOnError = false, eager, delayMs }: MakeReadableOptions) =>
  (readableOptions: ReadableOptions) =>
  (iterable: Iterable<unknown>): Readable => {
    let unsubscribe: (() => void) | undefined
    const iterator = iterate(iterable)
    let i = 0
    let done = false

    const push = function (this: Readable): boolean {
      if (i === errorAtStep) {
        log('emitting error at %d', i)
        this.emit('error', new Error(`error at ${i}`))

        if (!continueOnError) {
          log('break on error at %d', i)
          this.push(null)

          return false
        }
      }

      const iteratorResult = iterator.next()

      if (done || iteratorResult.done) {
        log('complete at %d', i)
        this.push(null)

        return false
      }

      log('push %d', i)

      const isOk = this.push(iteratorResult.value === null ? undefined : iteratorResult.value)

      if (!isOk) {
        log('backpressure at %d', i)
      }

      ++i

      return isOk
    }

    const syncHandler = function (this: Readable): void {
      if (eager) {
        log('eager read begin at %d', i)
        while (push.call(this)) {
          /* drain while the stream accepts data */
        }
        log('eager read end at %d', i)
      } else {
        log('lazy read %d', i)
        push.call(this)
      }
    }

    const asyncHandler = function (this: Readable): void {
      log('async read started')
      unsubscribe = waitTime(syncHandler.bind(this))(delayMs)
    }

    const stream = new Readable({
      ...readableOptions,
      read: isPositive(delayMs) ? asyncHandler : syncHandler,
      destroy() {
        unsubscribe?.()
        this.push(null)
      },
    })

    stream.on('removeListener', (name) => {
      log("removeListener for '%s', total: %d", name, stream.listenerCount(name))

      if (name === 'data' || name === 'readable') {
        if (stream.listenerCount('data') === 0 && stream.listenerCount('readable') === 0) {
          log('no more listeners for data - draining data')
          done = true
          setImmediate(() => stream.resume())
        }
      }
    })

    stream.on('newListener', (name) => {
      log("newListener for '%s', total: %d", name, stream.listenerCount(name) + 1)
    })

    return stream
  }
