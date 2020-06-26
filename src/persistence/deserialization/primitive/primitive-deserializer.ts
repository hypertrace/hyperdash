import { includes } from 'lodash';
import { JsonPrimitive } from '../../model-json';
import { Deserializer } from '../deserializer';

/**
 * Handles deserialization of basic primitives: string, number, boolean, undefined and null.
 */
export class PrimitiveDeserializer implements Deserializer<JsonPrimitive, JsonPrimitive> {
  private static readonly ALLOWED_PRIMITIVE_TYPES: string[] = ['string', 'number', 'boolean', 'undefined'];

  /**
   * @inheritdoc
   */
  public canDeserialize(json: JsonPrimitive): json is JsonPrimitive {
    return json === null || includes(PrimitiveDeserializer.ALLOWED_PRIMITIVE_TYPES, typeof json);
  }

  /**
   * @inheritdoc
   */
  public deserialize(json: JsonPrimitive): JsonPrimitive {
    return json;
  }
}
