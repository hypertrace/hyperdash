import { mapValues } from 'lodash-es';
import { PropertyLocation } from '../../../model/property/property-location';
import { JsonPrimitive } from '../../model-json';
import { DeserializationManager } from '../deserialization-manager';
import { Deserializer } from '../deserializer';

/**
 * Handles deserialization of a primitive JSON object, recursing back to the manager for each value
 */
export class ObjectDeserializer implements Deserializer<object, object> {
  public constructor(private readonly deserializationManager: DeserializationManager) {}

  /**
   * @inheritdoc
   */
  public canDeserialize(json: JsonPrimitive): json is object {
    // eslint-disable-next-line no-null/no-null
    return typeof json === 'object' && json !== null && Object.getPrototypeOf(json) === Object.prototype;
  }

  /**
   * @inheritdoc
   */
  public deserialize<T extends object>(object: T, location: PropertyLocation<T>): object {
    const newObject = {};

    const deserializeModelValue = (value: JsonPrimitive, key: keyof T) =>
      this.deserializationManager.deserialize(value, location.buildChildFromObjectAndKey(newObject as T, key));

    // tslint:disable-next-line:prefer-object-spread seems like a questionable rule, breaks behavior here
    return Object.assign(newObject, mapValues(object, deserializeModelValue));
  }
}
