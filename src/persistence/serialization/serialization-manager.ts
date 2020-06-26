import { PropertyLocation } from '../../model/property/property-location';
import { Logger } from '../../util/logging/logger';
import { JsonPrimitive } from '../model-json';
import { Serializer } from './serializer';

/**
 * Allows dynamic registration of serializers, delegating to the first matching
 * serializer, by order of registration, for serialization
 */
export class SerializationManager {
  private readonly serializers: Serializer[] = [];

  public constructor(private readonly logger: Logger) {}

  /**
   * Adds a new serializer to the lookup path for serialization
   */
  public registerSerializer<TDeserialized = unknown, TSerialized extends JsonPrimitive = JsonPrimitive>(
    serializer: Serializer<TDeserialized, TSerialized>
  ): void {
    this.serializers.push(serializer as Serializer);
  }

  /**
   * Searches for the first matching serializer and delegates to it
   *
   * Throws Error if no serializer can be determined or serialization fails
   */
  public serialize<S = unknown, T extends JsonPrimitive = JsonPrimitive>(value: S, location?: PropertyLocation<S>): T {
    return this.getMatchingSerializer<S, T>(value, location).serialize(value, location);
  }

  private getMatchingSerializer<S, T extends JsonPrimitive>(
    value: S,
    location?: PropertyLocation<S>
  ): Serializer<S, T> {
    const serializer = this.serializers.find(potentialSerializer =>
      potentialSerializer.canSerialize(value, location as PropertyLocation)
    );

    if (serializer) {
      return serializer as Serializer<S, T>;
    }

    return this.logger.error('No serializer registered matching provided value').throw();
  }
}
