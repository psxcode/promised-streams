# async-iterama
Asynchronous Iterator Streams with lots RxJS like operators

## Install

```sh
npm install async-iterama
```

- [Terminology](#terminology)
- [Iterator Protocol](#iterator-protocol)
- [Async Iterator Protocol](#async-iterator-protocol)
- [Publish / Subscribe Protocol](#publish-/-subscribe-protocol)
- [Interfaces](#interfaces)


## Terminology

`Push` type streams, where values are eagerly pushed by `producer` to `consumer`, as soon as available.  
`Pull` type stream, where values are lazily pulled by `consumer` from `producer`, as soon as needed.  
`Pressure` is a special data channel, carrying information about data saturation in the stream.

`PushProducer` is an active, `push` type producer, which pushes values to consumer, as soon as they are available.  
`PushConsumer` is a passive, `push` type consumer, which waits for values to arrive from producer.  
`Pressure` information in such streams is delivered from `consumer` to `producer`, in term of high pressure, or data consumption is in progress.

`PullConsumer` is an active, `pull` type consumer, which pulls values from producer as needed.  
`PullProducer` is a passive, `pull` type producer, which provides values to be pulled from.  
`Pressure` information is delivered from `producer` to `consumer`, in term of low pressure, or data production is in progress. 

## Iterator Protocol
Standard Javascript iterator protocol carries information about data and completeness of the iteration  
```js
const iterator = getIterator(data)

const chunk = iterator.next() // { value: 42, done: false }
```
`{ value: 42, done: false }` is a valid data chunk  
```js
const chunk = iterator.next() // { value: undefined, done: true }
```
`{ value: undefined, done: true }` is an iteration end chunk

This protocol implements lazy `Pull` type stream of values, with several limitations
- No `Error` information channel
- Synchronous delivery, so data must be available at the moment of request

## Async Iterator Protocol
Adding Javascript Promises to the Iterator Protocol, allows to carry additional information
```js
const iterator = getIterator(data)

const chunkPromise = iterator.next() // Promise<{ value, done }>

const chunk = await chunkPromise
```
Features of Asynchronous Iterator Protocol
- Lazy data requests, by calling `next` when needed.
- Async data delivery in chunks, by `await chunkPromise`.
- Async `Error` delivery by `rejected` Promises.
- End of stream indication by `{ value: undefined,  done: true }`.

## Publish / Subscribe Protocol
This protocol implements eager `Push` type streams of values
```js
producer.subscribe((chunk) => {
  consumeChunk(chunk)
})
```
- No `Error` delivery
- No end of stream indication
- No pressure control, data must be consumed synchronously

With adoption of Node's `error first` callback style, we can add `Error` delivery to this protocol
```js
producer.subscribe((error, chunk) => {
  if (error) {
    return reportError(error)
  }
  consumeChunk(chunk)
})
```
But still no `end of stream` and `pressure` respect. 

By adding Iterator Protocol chunk objects, we can add `end of stream` indication.
```js
producer.subscribe((error, { value, done }) => {
  if (error) {
    return reportError(error)
  }
  if (done) {
    return reportDone()
  }
  consumeChunk(value)
})
```
But still no `pressure` control.  

By introducing Async Iterator Protocol chunk objects, we can encapsulate `Error` in promise itself.
```js
producer.subscribe(async (chunkPromise) => {
  let chunk

  try {
    chunk = await chunkPromise
  } catch (e) {
    return reportError(e)
  }

  if (chunk.done) {
    return reportDone()
  }

  consumeChunk(chunk.value)
})
```
Now its easy to add support for `pressure` control.  
`Producer` must first resolve `Promise` returned by `Subscriber` function, and only after that send next value. We could also add `await` operator for `consumeChunk` function call...
```js
await consumeChunk(chunk.value)
```
Thus making `producer` to wait for chunk to be actually processed, before sending next one.

## Interfaces
`type AsyncIteratorResult <T> = Promise<IteratorResult<T>>`  
Just a Promise to a standard IteratorResult object

`type PushConsumer <T> = (value: AsyncIteratorResult<T>) => Promise<void>`  
`PushConsumer` is just a function which accepts a value and returns a `Promise` to have time to consume the chunk. This promise can be `rejected` to indicate error during data processing, or unsubscribe. Producer will immediately stop data delivery to unsubscribed consumer.

`type PushProducer <T> = (consumer: PushConsumer<T>) => Promise<void>`  
`PushProducer` is a function accepting `PushConsumer`. After getting a consumer, producer begins sending data to consumer. `PushProducer` returns a `Promise`, which resolves after all data was pushed to consumer. This promise will never be rejected. All error during data production will be forwarded to consumer.

`type PullProducer <T> = () => AsyncIteratorResult<T>`  
`PullProducer` is a function which returns a chunk of data, delivered as `Promise` to `IteratorResult`. Promise can be rejected by producer to indicate an `Error`.  

`type PullConsumer <T> = (producer: PullProducer<T>) => Promise<void>`  
`PullConsumer` is a function accepting `PullProducer`. After getting the producer, consumer begins pulling the data. `PullConsumer` returns a Promise, which will be resolved after add data was pulled, or will be rejected if producer delivered an `Error`.

# Operators
## `pullCombine`

`(context: SetTimeoutContext) => (callback: () => any, delay: number) => number`

```ts
import {
  makeSetTimeout,
  makeSetTimeoutContext,
  tickTimeout,
  getSetTimeoutCalls,
} from 'time-test'

// create context
const context = makeSetTimeoutContext()

// create setTimeout
const setTimeout = makeSetTimeout(context)
const tick = tickTimeout(context)

// set a couple of callbacks
setTimeout(() => { console.log('cb0 invoked') }, 100)
setTimeout(() => { console.log('cb1 invoked') }, 200)
setTimeout(() => { console.log('cb2 invoked') }, 300)

// tick till NEXT callback in queue,
// this effectively forwards 100ms
// callback is fired synchronously
tick()  // -> cb0 invoked

// tick with provided timeStep
// lets pass another 250ms
tick(250) // -> cb1 invoked  -> cb2 invoked

// check the calls
expect(getSetTimeoutCalls(context)).deep.eq([
  { delay: 100 }, { delay: 200 }, { delay: 300 }
])
```

## `makeClearTimeout`

`(context: SetTimeoutContext) => (id: number) => void`

```ts
import {
  makeSetTimeoutContext,
  makeSetTimeout,
  makeClearTimeout,
  getSetTimeoutCalls,
  getClearTimeoutCalls,
} from 'time-test'

// create context
const context = makeSetTimeoutContext()

// create setTimeout
const setTimeout = makeSetTimeout(context)
// create clearTimeout
const clearTimeout = makeClearTimeout(context)

const id = setTimeout(() => {}, 100)

// clear by id
clearTimeout(id)

// check the state
expect(getSetTimeoutCalls(context)).deep.eq([
  { delay: 100 }
])

expect(getClearTimeoutCalls(context)).deep.eq([
  { id: 0 }
])
```

## `makeSetInterval`

`(context: SetIntervalContext) => (callback: () => any, delay: number) => number`

```ts
import {
  makeSetInterval,
  makeSetIntervalContext,
  tickInterval,
  getSetIntervalCalls,
} from 'time-test'

// create context
const context = makeSetIntervalContext()

// create setInterval
const setInterval = makeSetInterval(context)
const tick = tickInterval(context)

// set a couple of callbacks
setInterval(() => { console.log('cb0 invoked') }, 100)
setInterval(() => { console.log('cb1 invoked') }, 200)

// tick till NEXT callback in queue,
// this effectively forwards 100ms
// callback is fired synchronously
tick()  // -> cb0 invoked

// tick with provided timeStep
// lets pass another 250ms
tick(250) // -> cb0 invoked  -> cb1 invoked

// check the state
expect(getSetIntervalCalls(context)).deep.eq([
  { delay: 100 },
  { delay: 200 },
])
```

## `makeClearInterval`

`(context: SetIntervalContext) => (id: number) => void`

```ts
import {
  makeSetInterval,
  makeSetIntervalContext,
  getSetIntervalCalls,
  getClearIntervalCalls,
} from 'time-test'

// create context
const context = makeSetIntervalContext()

// create setInterval
const setInterval = makeSetInterval(context)
const clearInterval = makeClearInterval(context)

// set a callbacks
const id = setInterval(() => {}, 100)

// clear
clearInterval(id)

// check the state
expect(getSetIntervalCalls(context)).deep.eq([
  { delay: 100 },
])

expect(getClearIntervalCalls(context)).deep.eq([
  { id: 0 }
])
```

## `makeSetImmediate`

`(context: SetImmediateContext) => (callback: () => any) => number`

```ts
import {
  makeSetImmediate,
  makeSetImmediateContext,
  tickImmediate,
  getSetImmediateCalls,
} from 'time-test'

// create context
const context = makeSetImmediateContext()

// create setImmediate
const setInterval = makeSetImmediate(context)
const tick = tickImmediate(context)

// set a couple of callbacks
setImmediate(() => { console.log('cb0 invoked') })
setImmediate(() => { console.log('cb1 invoked') })

// tick ALL callbacks in queue,
// callbacks are fired synchronously
tick()  // -> cb0 invoked  -> cb1 invoked

// check the state
expect(getSetImmediateCalls(context)).deep.eq([
  {},
  {},
])
```

## `makeClearImmediate`

`(context: SetImmediateContext) => (id: number) => void`

```ts
import {
  makeSetImmediate,
  makeSetImmediateContext,
  getSetImmediateCalls,
  getClearImmediateCalls,
} from 'time-test'

// create context
const context = makeSetImmediateContext()

// create setImmediate
const setImmediate = makeSetImmediate(context)
const clearImmediate = makeClearImmediate(context)

// set a callbacks
const id = setImmediate(() => {}, 100)

// clear
clearImmediate(id)

// check the state
expect(getSetImmediateCalls(context)).deep.eq([
  {},
])

expect(getClearImmediateCalls(context)).deep.eq([
  { id: 0 }
])
```

## `makeRequestAnimationFrame`

`(context: RequestAnimationFrameContext) => (callback: () => any) => number`

```ts
import {
  makeRequestAnimationFrame,
  makeRequestAnimationFrameContext,
  tickAnimation,
  getRequestAnimationFrameCalls,
} from 'time-test'

// create context
const context = makeRequestAnimationFrameContext()

// create requestAnimationFrame
const requestAnimationFrame = makeRequestAnimationFrame(context)
const tick = tickAnimation(context)

// set a couple of callbacks
requestAnimationFrame(() => { console.log('cb0 invoked') })
requestAnimationFrame(() => { console.log('cb1 invoked') })

// tick ALL callbacks in queue,
// callbacks are fired synchronously
tick()  // -> cb0 invoked  -> cb1 invoked

// check the state
expect(getRequestAnimationFrameCalls(context)).deep.eq([
  {},
  {},
])
```

## `makeCancelAnimationFrame`

`(context: RequestAnimationFrameContext) => (callback: () => any) => number`

```ts
import {
  makeRequestAnimationFrame,
  makeCancelAnimationFrame,
  makeRequestAnimationFrameContext,
  getRequestAnimationFrameCalls,
  getCancelAnimationFrameCalls,
} from 'time-test'

// create context
const context = makeRequestAnimationFrameContext()

// create requestAnimationFrame
const requestAnimationFrame = makeRequestAnimationFrame(context)
const cancelAnimationFrame = makeCancelAnimationFrame(context)

// set a couple of callbacks
const id = requestAnimationFrame(() => { console.log('cb0 invoked') })

cancelAnimationFrame(id)

// check the state
expect(getRequestAnimationFrameCalls(context)).deep.eq([
  {},
])

expect(getCancelAnimationFrameCalls(context)).deep.eq([
  { id: 0 },
])
```
