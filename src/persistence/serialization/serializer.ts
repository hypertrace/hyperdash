import { ModelPropertyTypeInstance } from '../../model/property/model-property-type-library';
import { PropertyLocation } from '../../model/property/property-location';
import { JsonPrimitive } from '../model-json';

/**
 * A deserialzation class which accepts a deserialized value or object and converts it to JSON form
 */
export interface Serializer<TDeserialized = unknown, TSerialized extends JsonPrimitive = JsonPrimitive> {
  /**
   * Returns true of the provided value can be serialized by this serializer
   */
  canSerialize(value: unknown, location?: PropertyLocation): value is TDeserialized;

  /**
   * Performs serialization, potentially recursively. Values provided to this method are assumed to be
   * valid as determined by the canSerialize method.
   *
   * Throws Error if serialization fails for any reason
   */
  serialize(value: TDeserialized, location?: PropertyLocation<TDeserialized>): TSerialized;
}

export type SerializationFunction<TDeserialized = unknown, TSerialized extends JsonPrimitive = JsonPrimitive> = (
  value: TDeserialized,
  location: PropertyLocation<TDeserialized>,
  propertyType: ModelPropertyTypeInstance
) => TSerialized;
