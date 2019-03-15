# Promise Streams
Promise-based Streams with lots of RxJS-like operators

## Install

```sh
npm install promise-streams
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
import { pullFromIterable } from 'promise-streams'

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
import { pushFromIterable } from 'promise-streams'

const data = [0, 1, 2, 3]
const pushProducer = pushFromIterable(data)

/* subscribe to PushProducer */
await pushProducer(async (result) => {
  try {
    /* unwrap the value */
    const { value, done } = await result

    /* check if done */
    if (done) {
      return
    }

    /* consume the value */
    console.log(value)
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

## `pullFromStream`
`<T> (stream: NodeJS.ReadableStream) => PullProducer<T>`
```js
import { pullFromStream } from 'promise-streams'

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
import { pushFromStream } from 'promise-streams'

const readable = createStream()
const pushProducer = pushFromStream()

/* subscribe to PushProducer */
await pushProducer(async (result) => {
  try {
    /* unwrap the value */
    const { value, done } = await result

    /* check if done */
    if (done) {
      return
    }

    /* consume the value */
    console.log(value)
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

# Conversion

## `pool`
Converts `Push` type producer to `Pull` type producer.
`<T> (options: IPoolOptions) => IPool<T>`
```js
import { pool, pushFromIterable } from 'promise-streams'

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
Converts `Pull` type producer to `Push` type producer.
`<T> (producer: PullProducer<T>) => PushProducer<T>`
```js
import { pump } from 'promise-streams'

/* create PullProducer */
const data = [0, 1, 2, 3]
const pullProducer = pullFromIterable(data)

/* create PushProducer from PullProducer */
const pushProducer = pump(pullProducer)

/* subscribe to PushProducer */
await pushProducer(async (result) => {
  try {
    /* unwrap the value */
    const { value, done } = await result

    /* check if done */
    if (done) {
      return
    }

    /* consume the value */
    console.log(value)
  } catch (e) {
    /* catch errors */
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
import { pullConcat } from 'promise-streams'
```

## `pushConcat`
Concatenates all `Push` producers, creating single `Push` producer, which delivers the data from each, excluding `done`. End of stream is delivered once, at the end.
`<T> (...producers: PushProducer<T>[]) => PushProducer<T>`
```js
import { pushConcat } from 'promise-streams'

const pp0 = getPushProducer()
const pp1 = getPushProducer()
const pp2 = getPushProducer()

/* create concatenated PushProducer */
const concatenatedProducer = pushConcat(pp0, pp1, pp2)

/* subscribe to PushProducer */
await concatenatedProducer(async (result) => {
  try {
    /* unwrap the value */
    const { value, done } = await result

    /* check if done */
    if (done) {
      return
    }

    /* consume the value */
    console.log(value)
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

## `pullCombine`
`<T> (...producers: PullProducers<T>[]) => PullProducer<T>`
```js
import { pullCombine } from 'promise-streams'
```

## `pushCombine`
`<...> (...producers: PushProducer<...>[]) => PushProducer<[...]>`
```js
import { pushCombine } from 'promise-streams'

const pp0 = getPushProducer()
const pp1 = getPushProducer()
const pp2 = getPushProducer()

/* create combined PushProducer */
const combinedProducer = pushCombine(pp0, pp1, pp2)

/* subscribe to PushProducer */
await combinedProducer(async (result) => {
  try {
    /* unwrap the value */
    const { value, done } = await result

    /* check if done */
    if (done) {
      return
    }

    /* consume the value */
    console.log(value)
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

## `pullMerge`
`<T> (...producers: PullProducers<T>[]) => PullProducer<T>`
```js
import { pullMerge } from 'promise-streams'
```

## `pushMerge`
`<T> (...producers: PushProducer<T>[]) => PushProducer<T>`
```js
import { pushMerge } from 'promise-streams'

const pp0 = getPushProducer()
const pp1 = getPushProducer()
const pp2 = getPushProducer()

/* create merged PushProducer */
const mergedProducer = pushMerge(pp0, pp1, pp2)

/* subscribe to PushProducer */
await mergedProducer(async (result) => {
  try {
    /* unwrap the value */
    const { value, done } = await result

    /* check if done */
    if (done) {
      return
    }

    /* consume the value */
    console.log(value)
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

## `pullStartWith`
`<T> (...values: T[]) => (producer: PullProducer<T>) => PullProducer<T>`
```js
import { pullStartWith } from 'promise-streams'
```

## `pushStartWith`
`<T> (...values: T[]) => (consumer: PushConsumer<T>) => PushConsumer<T>`
```js
import { pushStartWith } from 'promise-streams'

const producer = getPushProducer()

const startWithProducer = pushStartWith(1, 2, 3)(producer)

/* subscribe to PushProducer */
await startWithProducer(async (result) => {
  try {
    /* unwrap the value */
    const { value, done } = await result

    /* check if done */
    if (done) {
      return
    }

    /* consume the value */
    console.log(value)
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

## `pullWithLatest`
`<...> (...producers: PullProducer<...>[]) => <T>(mainProducer: PullProducer<T>) => PullProducer<[T, ...]>`
```js
import { pullWithLatest } from 'promise-streams'
```

## `pushWithLatest`
`<...> (...producers: PushProducer<...>[]) => <T> (mainProducer: PushProducer<T>) => PushProducer<T, ...>`
```js
import { pushWithLatest } from 'promise-streams'

const pp0 = getPushProducer()
const pp1 = getPushProducer()
const pp2 = getPushProducer()
const mainProducer = getPushProducer()

const withLatestProducer = (pp0, pp1, pp2)(mainProducer)

/* subscribe to PushProducer */
await withLatestProducer(async (result) => {
  try {
    /* unwrap the value */
    const { value, done } = await result

    /* check if done */
    if (done) {
      return
    }

    /* consume the value */
    console.log(value)
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

## `pullZip`
`<...> (...producers: PullProducer<...>[]) => PullProducer<[...]>`
```js
import { pullZip } from 'promise-streams'
```

## `pushZip`
`<...> (...producers: PushProducer<...>[]) => PushProducer<[...]>`
```js
import { pushZip } from 'promise-streams'

const pp0 = getPushProducer()
const pp1 = getPushProducer()
const pp2 = getPushProducer()

/* create zip PushProducer */
const zippedProducer = pushZip(pp0, pp1, pp2)

/* subscribe to PushProducer */
await zippedProducer(async (result) => {
  try {
    /* unwrap the value */
    const { value, done } = await result

    /* check if done */
    if (done) {
      return
    }

    /* consume the value */
    console.log(value)
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

# Filtering

## `pullFilter`
`<T> (predicate: (arg: T) => Promise<boolean> | boolean) => (producer: PullProducer<T>) => PullProducer<T>`
```js
import { pullFilter } from 'promise-streams'
```

## `pushFilter`
`<T> (predicate: (arg: T) => Promise<boolean> | boolean) => (consumer: PushConsumer<T>) => PushConsumer<T>`
```js
import { pushFilter } from 'promise-streams'

const producer = getPushProducer()

const isEven = x => x % 2 === 0

/* create filtered producer */
const filteredProducer = pushFilter(isEven)(producer)

/* subscribe to PushProducer */
await filteredProducer(async (result) => {
  try {
    /* unwrap the value */
    const { value, done } = await result

    /* check if done */
    if (done) {
      return
    }

    /* consume the value */
    console.log(value)
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

## `pullDistinct`
`<T> (isAllowed: (prev: T, next: T) => Promise<boolean> | boolean) => (producer: PullProducer<T>) => PullProducer<T>`
```js
import { pullDistinct } from 'promise-streams'
```

## `pushDistinct`
`<T> (isAllowed: (prev: T, next: T) => Promise<boolean> | boolean) => (consumer: PushConsumer<T>) => PushConsumer<T>`
```js
import { pushDistinct } from 'promise-streams'

const isAllowed = (prev, next) => prev !== next

const producer = getPushProducer()
/* create filtered producer */
const filteredProducer = pushDistinct(isAllowed)(producer)

/* subscribe to PushProducer */
await filteredProducer(async (result) => {
  try {
    /* unwrap the value */
    const { value, done } = await result

    /* check if done */
    if (done) {
      return
    }

    /* consume the value */
    console.log(value)
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

## `pullDistinctUntilChanged`
`<T> (producer: PullProducer<T>) => PullProducer<T>`
```js
import { pullDistinctUntilChanged } from 'promise-streams'
```

## `pushDistinctUntilChanged`
`<T> (consumer: PushConsumer<T>) => PushConsumer<T>`
```js
import { pushDistinctUntilChanged } from 'promise-streams'

const producer = getPushProducer()
/* create filtered producer */
const filteredProducer = pushDistinctUntilChanged(producer)

/* subscribe to PushProducer */
await pushProducer(async (result) => {
  try {
    /* unwrap the value */
    const { value, done } = await result

    /* check if done */
    if (done) {
      return
    }

    /* consume the value */
    console.log(value)
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

## `pullUnique`
`<T> (producer: PullProducer<T>) => PullProducer<T>`
```js
import { pullUnique } from 'promise-streams'
```

## `pushUnique`
`<T> (consumer: PushConsumer<T>) => PushConsumer<T>`
```js
import { pushUnique } from 'promise-streams'

const producer = getPushProducer()
/* create filtered producer */
const filteredProducer = pushUnique(producer)

/* subscribe to PushProducer */
await filteredProducer(async (result) => {
  try {
    /* unwrap the value */
    const { value, done } = await result

    /* check if done */
    if (done) {
      return
    }

    /* consume the value */
    console.log(value)
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

## `pushDebounce`
`(wait: WaitFn) => <T> (consumer: PushConsumer<T>): PushConsumer<T>`
```js
import { pushDebounce } from 'promise-streams'

const waitFn = () => new Promise((resolve) => setTimeout(resolve, 1000))

const producer = getPushProducer()
/* create debounced producer */
const debouncedProducer = pushDebounce(waitFn)(producer)

/* subscribe to PushProducer */
await debouncedProducer(async (result) => {
  try {
    /* unwrap the value */
    const { value, done } = await result

    /* check if done */
    if (done) {
      return
    }

    /* consume the value */
    console.log(value)
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

## `pushDebounceTime`
`(ms: number) => <T> (consumer: PushConsumer<T>) => PushConsumer<T>`
```js
import { pushDebounceTime } from 'promise-streams'

const producer = getPushProducer()
/* create debounced producer */
const debouncedProducer = pushDebounceTime(1000)(producer)

/* subscribe to PushProducer */
await debouncedProducer(async (result) => {
  try {
    /* unwrap the value */
    const { value, done } = await result

    /* check if done */
    if (done) {
      return
    }

    /* consume the value */
    console.log(value)
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

## `pushThrottle`
`(wait: WaitFn) => <T> (consumer: PushConsumer<T>) => PushConsumer<T>`
```js
import { pushThrottle } from 'promise-streams'

const waitFn = () => new Promise((resolve) => setTimeout(resolve, 100))

const producer = getPushProducer()
/* create throttled producer */
const throttledProducer = pushThrottle(waitFn)(producer)

/* subscribe to PushProducer */
await throttledProducer(async (result) => {
  try {
    /* unwrap the value */
    const { value, done } = await result

    /* check if done */
    if (done) {
      return
    }

    /* consume the value */
    console.log(value)
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

## `pushThrottleTime`
`(ms: number) => <T> (consumer: PushConsumer<T>) => PushConsumer<T>`
```js
import { pushThrottleTime } from 'promise-streams'

const producer = getPushProducer()
const throttledProducer = pushThrottleTime(100)(producer)

/* subscribe to PushProducer */
await throttledProducer(async (result) => {
  try {
    /* unwrap the value */
    const { value, done } = await result

    /* check if done */
    if (done) {
      return
    }

    /* consume the value */
    console.log(value)
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

## `pullSkip`
`(numSkip: number) => <T> (producer: PullProducer<T>) => PullProducer<T>`
```js
import { pullSkip } from 'promise-streams'
```

## `pushSkip`
`(numSkip: number) => <T> (consumer: PushConsumer<T>) => PushConsumer<T>`
```js
import { pushSkip } from 'promise-streams'

const producer = getPushProducer()

/* subscribe to PushProducer */
await pushProducer(async (result) => {
  try {
    /* unwrap the value */
    const { value, done } = await result

    /* check if done */
    if (done) {
      return
    }

    /* consume the value */
    console.log(value)
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

## `pullTake`
`(numTake: number) => <T> (producer: PullProducer<T>) => PullProducer<T>`
```js
import { pullTake } from 'promise-streams'
```

## `pushTake`
`(numTake: number) => <T> (consumer: PushConsumer<T>) => PushConsumer<T>`
```js
import { pushTake } from 'promise-streams'
```

# Transformation

## `pullMap`
`<T, R> (xf: (arg: T) => Promise<R> | R) => (producer: PullProducer<T>) => PullProducer<R>`
```js
import { pullMap } from 'promise-streams'
```

## `pushMap`
`<T, R> (xf: (arg: T) => Promise<R> | R) => (consumer: PushConsumer<R>) => PushConsumer<T>`
```js
import { pushMap } from 'promise-streams'
```

## `pullReduce`
`<S, T> (reducer: (state?: S, value?: T) => Promise<S> | S) => (producer: PullProducer<T>) => PullProducer<S>`
```js
import { pullReduce } from 'promise-streams'
```

## `pushReduce`
`<S, T> (reducer: (state?: S, value?: T) => Promise<S> | S) => (consumer: PushConsumer<S>) => PushConsumer<T>`
```js
import { pushReduce } from 'promise-streams'
```

## `pullScan`
`<S, T> (reducer: (state?: S, value?: T) => Promise<S> | S) => (producer: PullProducer<T>) => PullProducer<S>`
```js
import { pullScan } from 'promise-streams'
```

## `pushScan`
`<S, T> (reducer: (state?: S, value?: T) => Promise<S> | S) => (consumer: PushConsumer<S>) => PushConsumer<T>`
```js
import { pushScan } from 'promise-streams'
```
