import { PropertyLocation } from '../../../model/property/property-location';
import { JsonPrimitive, JsonPrimitiveArray } from '../../model-json';
import { DeserializationManager } from '../deserialization-manager';
import { Deserializer } from '../deserializer';

/**
 * Handles deserialization of an array type, recursing back to the manager for each value
 */
export class ArrayDeserializer implements Deserializer<JsonPrimitiveArray, unknown[]> {
  public constructor(private readonly deserializationManager: DeserializationManager) {}

  /**
   * @inheritdoc
   */
  public canDeserialize(json: JsonPrimitive): json is JsonPrimitiveArray {
    return Array.isArray(json);
  }

  /**
   * @inheritdoc
   */
  public deserialize(array: JsonPrimitiveArray, location?: PropertyLocation<unknown[]>): unknown[] {
    const newArray: unknown[] = [];

    const deserializeModelValue = (value: JsonPrimitive, index: number) =>
      this.deserializationManager.deserialize(value, location!.buildChildFromObjectAndKey(newArray, index));

    newArray.push(...array.map(deserializeModelValue));

    return newArray;
  }
}
