export const isPositiveNumber = (num?: number): num is number => num !== undefined && isFinite(num) && num >= 0
