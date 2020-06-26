import { PropertyLocation } from '../../../model/property/property-location';
import { JsonPrimitiveArray } from '../../model-json';
import { SerializationManager } from '../serialization-manager';
import { Serializer } from '../serializer';

/**
 * Handles serialization of an array type, recursing back to the manager for each value
 */
export class ArraySerializer implements Serializer<unknown[], JsonPrimitiveArray> {
  public constructor(private readonly serializationManager: SerializationManager) {}

  /**
   * @inheritdoc
   */
  public canSerialize(value: unknown): value is unknown[] {
    return Array.isArray(value);
  }

  /**
   * @inheritdoc
   */
  public serialize(array: unknown[], location?: PropertyLocation<unknown[]>): JsonPrimitiveArray {
    const newArray: JsonPrimitiveArray = [];

    const serializeModelValue = (value: unknown, index: number) =>
      this.serializationManager.serialize(value, location!.buildChildFromObjectAndKey(array, index));

    newArray.push(...array.map(serializeModelValue));

    return newArray;
  }
}
