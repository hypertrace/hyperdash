/**
 * JSON representing a model class
 */
export interface ModelJson {
  [key: string]: JsonPrimitive;
  /**
   * Model type - the serialization key used to find the model class
   */
  type: string;
}

/**
 * An array of `JsonPrimitive`
 */
export interface JsonPrimitiveArray extends Array<JsonPrimitive> {}

export type JsonPrimitive = string | number | boolean | object | undefined | null | JsonPrimitiveArray | ModelJson;
