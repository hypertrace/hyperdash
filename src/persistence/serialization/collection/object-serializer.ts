import { mapValues } from 'lodash-es';
import { PropertyLocation } from '../../../model/property/property-location';
import { SerializationManager } from '../serialization-manager';
import { Serializer } from '../serializer';

/**
 * Handles serialization of a primitive JSON object, recursing back to the manager for each value
 */
export class ObjectSerializer implements Serializer<object, object> {
  public constructor(private readonly serializationManager: SerializationManager) {}

  /**
   * @inheritdoc
   */
  public canSerialize(value: unknown): value is object {
    return typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype;
  }

  /**
   * @inheritdoc
   */
  public serialize<T extends object>(sourceObject: T, location?: PropertyLocation<T>): object {
    const newObject = {};

    const serializeModelValue = (value: T[keyof T], key: keyof T) =>
      this.serializationManager.serialize<T[keyof T]>(value, location!.buildChildFromObjectAndKey(sourceObject, key));

    // tslint:disable-next-line:prefer-object-spread seems like a questionable rule, breaks behavior here
    return Object.assign(newObject, mapValues(sourceObject, serializeModelValue));
  }
}
