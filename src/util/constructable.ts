/**
 * A function representing a constructor for some class
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Constructable<T> = new (...args: any[]) => T;

/**
 * A function representing a constructor for an unknown class
 */
export interface UnknownConstructable extends Constructable<unknown> {}

/**
 * A function representing a constructor for any object
 */
export interface ObjectConstructable extends Constructable<object> {}
