import { ModelPropertyTypeInstance } from '../../model/property/model-property-type-library';
import { PropertyLocation } from '../../model/property/property-location';
import { JsonPrimitive } from '../model-json';

/**
 * A deserialzation class which accepts JSON or some JSON fragment and returns a deserialized version
 */
export interface Deserializer<TSerialized extends JsonPrimitive = JsonPrimitive, TDeserialized = unknown> {
  /**
   * Returns true of the provided value can be deserialized by this deserializer
   */
  canDeserialize(json: JsonPrimitive): json is TSerialized;

  /**
   * Performs deserialiazation, potentially recursively. Values provided to this method are assumed to be
   * valid as determined by the canDeserialize method.
   *
   * Throws Error if deserialization fails for any reason
   */
  deserialize(json: TSerialized, location?: PropertyLocation<TDeserialized>): TDeserialized;
}

export type DeserializationFunction<TSerialized extends JsonPrimitive = JsonPrimitive, TDeserialized = unknown> = (
  json: TSerialized,
  location: PropertyLocation<TDeserialized>,
  propertyType: ModelPropertyTypeInstance
) => TDeserialized;
