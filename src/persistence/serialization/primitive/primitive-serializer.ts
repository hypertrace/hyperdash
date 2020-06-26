import { includes } from 'lodash';
import { JsonPrimitive } from '../../model-json';
import { Serializer } from '../serializer';

/**
 * Handles serialization of basic primitives: string, number, boolean, undefined and null.
 */
export class PrimitiveSerializer implements Serializer<JsonPrimitive> {
  private static readonly ALLOWED_PRIMITIVE_TYPES: string[] = ['string', 'number', 'boolean', 'undefined'];

  /**
   * @inheritdoc
   */
  public canSerialize(value: unknown): value is JsonPrimitive {
    return value === null || includes(PrimitiveSerializer.ALLOWED_PRIMITIVE_TYPES, typeof value);
  }

  /**
   * @inheritdoc
   */
  public serialize(value: JsonPrimitive): JsonPrimitive {
    return value;
  }
}
