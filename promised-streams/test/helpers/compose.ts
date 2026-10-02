export type AnyFn = (arg: any) => any

export const pipe =
  (...fns: AnyFn[]): AnyFn =>
  (initial: any): any =>
    fns.reduce<any>((arg, fn) => fn(arg), initial)

export const compose =
  (...fns: AnyFn[]): AnyFn =>
  (initial: any): any =>
    fns.reduceRight<any>((arg, fn) => fn(arg), initial)
