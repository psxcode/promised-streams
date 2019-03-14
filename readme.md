# Promise Streams
Promise-based Streams with lots of RxJS-like operators

## Install

```sh
npm install async-iterama
```

- [Promise Streams](#promise-streams)
  - [Install](#install)
  - [Terminology](#terminology)
  - [Iterator Protocol](#iterator-protocol)
  - [Async Iterator Protocol](#async-iterator-protocol)
  - [Publish / Subscribe Protocol](#publish--subscribe-protocol)
  - [Interfaces](#interfaces)
- [Creation](#creation)
  - [`pullFromIterable`](#pullfromiterable)
  - [`pushFromIterable`](#pushfromiterable)
  - [`pullFromStream`](#pullfromstream)
  - [`pushFromStream`](#pushfromstream)
- [Conversion](#conversion)
  - [`pool`](#pool)
  - [`pump`](#pump)
- [Combination](#combination)
  - [`pullConcat`](#pullconcat)
  - [`pushConcat`](#pushconcat)
  - [`pullCombine`](#pullcombine)
  - [`pushCombine`](#pushcombine)
  - [`pullMerge`](#pullmerge)
  - [`pushMerge`](#pushmerge)
  - [`pullStartWith`](#pullstartwith)
  - [`pushStartWith`](#pushstartwith)
  - [`pullWithLatest`](#pullwithlatest)
  - [`pushWithLatest`](#pushwithlatest)
  - [`pullZip`](#pullzip)
  - [`pushZip`](#pushzip)
- [Filtering](#filtering)
  - [`pullFilter`](#pullfilter)
  - [`pushFilter`](#pushfilter)
  - [`pullDistinct`](#pulldistinct)
  - [`pushDistinct`](#pushdistinct)
  - [`pullDistinctUntilChanged`](#pulldistinctuntilchanged)
  - [`pushDistinctUntilChanged`](#pushdistinctuntilchanged)
  - [`pullUnique`](#pullunique)
  - [`pushUnique`](#pushunique)
  - [`pushDebounce`](#pushdebounce)
  - [`pushDebounceTime`](#pushdebouncetime)
  - [`pushThrottle`](#pushthrottle)
  - [`pushThrottleTime`](#pushthrottletime)
  - [`pullSkip`](#pullskip)
  - [`pushSkip`](#pushskip)
  - [`pullTake`](#pulltake)
  - [`pushTake`](#pushtake)
- [Transformation](#transformation)
  - [`pullMap`](#pullmap)
  - [`pushMap`](#pushmap)
  - [`pullReduce`](#pullreduce)
  - [`pushReduce`](#pushreduce)
  - [`pullScan`](#pullscan)
  - [`pushScan`](#pushscan)


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

`Pool`.  
`Pump`.  

## Iterator Protocol
Standard Javascript iterator protocol carries data and end of the iteration indicator  
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

`type PushConsumer <T> = (value: Promise<IteratorResult<T>>) => Promise<void>`  
`PushConsumer` is just a function which accepts a value and returns a `Promise` to have time to consume the chunk. This promise can be `rejected` to indicate error during data processing, or unsubscribe. Producer will immediately stop data delivery to unsubscribed consumer.

`type PushProducer <T> = (consumer: PushConsumer<T>) => Promise<void>`  
`PushProducer` is a function accepting `PushConsumer`. After getting a consumer, producer begins sending data to consumer. `PushProducer` returns a `Promise`, which resolves after all data was pushed to consumer. This promise will never be rejected. All error during data production will be forwarded to consumer.

`type PullProducer <T> = () => Promise<IteratorResult<T>>`  
`PullProducer` is a function which returns a chunk of data, delivered as `Promise` to `IteratorResult`. Promise can be rejected by producer to indicate an `Error`.  

`type PullConsumer <T> = (producer: PullProducer<T>) => Promise<void>`  
`PullConsumer` is a function accepting `PullProducer`. After getting the producer, consumer begins pulling the data. `PullConsumer` returns a Promise, which will be resolved after add data was pulled, or will be rejected if producer delivered an `Error`.

# Creation
## `pullFromIterable`
`<T> (iterable: Iterable<T>) => PullProducer<T>`
```js
import { pullFromIterable } from 'async-iterama'

const data = [0, 1, 2, 3]
const producer = pullFromIterable(data)

try {
  while (true) {
    const { value, done } = await producer()

    if (done) {
      break
    }

    console.log(value)
  }
} catch (e) {
  console.error(e)
}
```

## `pushFromIterable`
`<T> (iterable: Iterable<T>) => PushProducer<T>`
```js
import { pushFromIterable } from 'async-iterama'

const data = [0, 1, 2, 3]
const producer = pushFromIterable(data)

await producer(async (result) => {
  try {
    const { value, done } = await result

    if (done) {
      return
    }

    console.log(value)
  } catch (e) {
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

## `pullFromStream`
`<T> (stream: NodeJS.ReadableStream) => PullProducer<T>`
```js
import { pullFromStream } from 'async-iterama'

const readable = createStream()
const producer = pullFromStream(readable)

try {
  while (true) {
    const { value, done } = await producer()

    if (done) {
      break
    }

    console.log(value)
  }
} catch (e) {
  console.error(e)
}
```

## `pushFromStream`
`<T> (stream: NodeJS.ReadableStream) => PushProducer<T>`
```js
import { pushFromStream } from 'async-iterama'

const readable = createStream()
const producer = pushFromStream()

await producer(async (result) => {
  try {
    const { value, done } = await result

    if (done) {
      return
    }

    console.log(value)
  } catch (e) {
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

# Conversion

## `pool`
`<T> (options: IPoolOptions) => IPool<T>`
```js
import { pool, pushFromIterable } from 'async-iterama'

const data = [0, 1, 2, 3]
const producer = pushFromIterable(data)

const { pull, push } = pool({ highWatermark: 32 })

producer(push)

try {
  while (true) {
    const { value, done } = await pull()

    if (done) {
      break
    }

    console.log(value)
  }
} catch (e) {
  console.error(e)
}
```

## `pump`
`<T> (producer: PullProducer<T>) => PushProducer<T>`
```js
import { pump } from 'async-iterama'

const data = [0, 1, 2, 3]
const pullProducer = pullFromIterable(data)

const pushProducer = pump(pullProducer)

await pushProducer(async (result) => {
  try {
    const { value, done } = await result

    if (done) {
      return
    }

    console.log(value)
  } catch (e) {
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

# Combination

## `pullConcat`
`<T> (...producers: PullProducers<T>[]) => PullProducer<T>`
```js
import { pullConcat } from 'async-iterama'
```

## `pushConcat`
`<T> (...producers: PushProducer<T>[]) => PushProducer<T>`
```js
import { pushConcat } from 'async-iterama'
```

## `pullCombine`
`<T> (...producers: PullProducers<T>[]) => PullProducer<T>`
```js
import { pullCombine } from 'async-iterama'
```

## `pushCombine`
`<T> (...producers: PushProducer<T>[]) => PushProducer<T>`
```js
import { pushCombine } from 'async-iterama'
```

## `pullMerge`
`<T> (...producers: PullProducers<T>[]) => PullProducer<T>`
```js
import { pullMerge } from 'async-iterama'
```

## `pushMerge`
`<T> (...producers: PushProducer<T>[]) => PushProducer<T>`
```js
import { pushMerge } from 'async-iterama'
```

## `pullStartWith`
`<T> (...values: T[]) => (producer: PullProducer<T>) => PullProducer<T>`
```js
import { pullStartWith } from 'async-iterama'
```

## `pushStartWith`
`<T> (...values: T[]) => (consumer: PushConsumer<T>) => PushConsumer<T>`
```js
import { pushStartWith } from 'async-iterama'
```

## `pullWithLatest`
`<...> (...producers: PullProducer<...>[]) => <T>(mainProducer: PullProducer<T>) => PullProducer<[T, ...]>`
```js
import { pullWithLatest } from 'async-iterama'
```

## `pushWithLatest`
`<...> (...producers: PushProducer<...>[]) => <T> (mainProducer: PushProducer<T>) => PushProducer<T, ...>`
```js
import { pushWithLatest } from 'async-iterama'
```

## `pullZip`
`<...> (...producers: PullProducer<...>[]) => PullProducer<[...]>`
```js
import { pullZip } from 'async-iterama'
```

## `pushZip`
`<...> (...producers: PushProducer<...>[]) => PushProducer<[...]>`
```js
import { pushZip } from 'async-iterama'
```

# Filtering

## `pullFilter`
`<T> (predicate: (arg: T) => Promise<boolean> | boolean) => (producer: PullProducer<T>) => PullProducer<T>`
```js
import { pullFilter } from 'async-iterama'
```

## `pushFilter`
`<T> (predicate: (arg: T) => Promise<boolean> | boolean) => (consumer: PushConsumer<T>) => PushConsumer<T>`
```js
import { pushFilter } from 'async-iterama'
```

## `pullDistinct`
`<T> (isAllowed: (prev: T, next: T) => Promise<boolean> | boolean) => (producer: PullProducer<T>) => PullProducer<T>`
```js
import { pullDistinct } from 'async-iterama'
```

## `pushDistinct`
`<T> (isAllowed: (prev: T, next: T) => Promise<boolean> | boolean) => (consumer: PushConsumer<T>) => PushConsumer<T>`
```js
import { pushDistinct } from 'async-iterama'
```

## `pullDistinctUntilChanged`
`<T> (producer: PullProducer<T>) => PullProducer<T>`
```js
import { pullDistinctUntilChanged } from 'async-iterama'
```

## `pushDistinctUntilChanged`
`<T> (consumer: PushConsumer<T>) => PushConsumer<T>`
```js
import { pushDistinctUntilChanged } from 'async-iterama'
```

## `pullUnique`
`<T> (producer: PullProducer<T>) => PullProducer<T>`
```js
import { pullUnique } from 'async-iterama'
```

## `pushUnique`
`<T> (consumer: PushConsumer<T>) => PushConsumer<T>`
```js
import { pushUnique } from 'async-iterama'
```

## `pushDebounce`
`(wait: WaitFn) => <T> (consumer: PushConsumer<T>): PushConsumer<T>`
```js
import { pushDebounce } from 'async-iterama'
```

## `pushDebounceTime`
`(ms: number) => <T> (consumer: PushConsumer<T>) => PushConsumer<T>`
```js
import { pushDebounceTime } from 'async-iterama'
```

## `pushThrottle`
`(wait: WaitFn) => <T> (consumer: PushConsumer<T>) => PushConsumer<T>`
```js
import { pushThrottle } from 'async-iterama'
```

## `pushThrottleTime`
`(ms: number) => <T> (consumer: PushConsumer<T>) => PushConsumer<T>`
```js
import { pushThrottleTime } from 'async-iterama'
```

## `pullSkip`
`(numSkip: number) => <T> (producer: PullProducer<T>) => PullProducer<T>`
```js
import { pullSkip } from 'async-iterama'
```

## `pushSkip`
`(numSkip: number) => <T> (consumer: PushConsumer<T>) => PushConsumer<T>`
```js
import { pushSkip } from 'async-iterama'
```

## `pullTake`
`(numTake: number) => <T> (producer: PullProducer<T>) => PullProducer<T>`
```js
import { pullTake } from 'async-iterama'
```

## `pushTake`
`(numTake: number) => <T> (consumer: PushConsumer<T>) => PushConsumer<T>`
```js
import { pushTake } from 'async-iterama'
```

# Transformation

## `pullMap`
`<T, R> (xf: (arg: T) => Promise<R> | R) => (producer: PullProducer<T>) => PullProducer<R>`
```js
import { pullMap } from 'async-iterama'
```

## `pushMap`
`<T, R> (xf: (arg: T) => Promise<R> | R) => (consumer: PushConsumer<R>) => PushConsumer<T>`
```js
import { pushMap } from 'async-iterama'
```

## `pullReduce`
`<S, T> (reducer: (state?: S, value?: T) => Promise<S> | S) => (producer: PullProducer<T>) => PullProducer<S>`
```js
import { pullReduce } from 'async-iterama'
```

## `pushReduce`
`<S, T> (reducer: (state?: S, value?: T) => Promise<S> | S) => (consumer: PushConsumer<S>) => PushConsumer<T>`
```js
import { pushReduce } from 'async-iterama'
```

## `pullScan`
`<S, T> (reducer: (state?: S, value?: T) => Promise<S> | S) => (producer: PullProducer<T>) => PullProducer<S>`
```js
import { pullScan } from 'async-iterama'
```

## `pushScan`
`<S, T> (reducer: (state?: S, value?: T) => Promise<S> | S) => (consumer: PushConsumer<S>) => PushConsumer<T>`
```js
import { pushScan } from 'async-iterama'
```
