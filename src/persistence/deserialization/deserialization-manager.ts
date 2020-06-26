import { PropertyLocation } from '../../model/property/property-location';
import { Logger } from '../../util/logging/logger';
import { JsonPrimitive } from '../model-json';
import { Deserializer } from './deserializer';

/**
 * Allows dynamic registration of deserializers, delegating to the first matching
 * Deserializer, by order of registration, for deserialization
 */
export class DeserializationManager {
  private readonly deserializers: Deserializer[] = [];

  public constructor(private readonly logger: Logger) {}

  /**
   * Adds a new deserialier to the lookup path for deserialization
   */
  public registerDeserializer<TSerialized extends JsonPrimitive = JsonPrimitive, TDeserialized = unknown>(
    deserializer: Deserializer<TSerialized, TDeserialized>
  ): void {
    this.deserializers.push(deserializer as Deserializer);
  }

  /**
   * Searches for the first matching deserializer and delegates to it
   *
   * Throws Error if no deserializer can be determined or deserialization fails
   */
  public deserialize<T = unknown>(json: JsonPrimitive, location?: PropertyLocation<T>): T {
    return this.getMatchingDeserializer<T>(json).deserialize(json, location);
  }

  private getMatchingDeserializer<T>(json: JsonPrimitive): Deserializer<JsonPrimitive, T> {
    const deserializer = this.deserializers.find(potentialDeserializer => potentialDeserializer.canDeserialize(json));

    if (deserializer) {
      return deserializer as Deserializer<JsonPrimitive, T>;
    }

    return this.logger.error('No deserializer registered matching provided json value').throw();
  }
}
