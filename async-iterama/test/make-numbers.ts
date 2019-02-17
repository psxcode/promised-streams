const makeNumbers = (length: number): Iterable<number> => ({
  * [Symbol.iterator] () {
    for (let i = 0; i < length; ++i) {
      yield i
    }
  },
})

export default makeNumbers
