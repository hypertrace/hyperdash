/**
 * A function representing a constructor for some class
 */
// tslint:disable-next-line:no-any
export type Constructable<T> = new (...args: any[]) => T;

/**
 * A function representing a constructor for an unknown class
 */
export interface UnknownConstructable extends Constructable<unknown> {}

/**
 * A function representing a constructor for any object
 */
export interface ObjectConstructable extends Constructable<object> {}
