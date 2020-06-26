import { DeserializationFunction } from '../../persistence/deserialization/deserializer';
import { JsonPrimitive } from '../../persistence/model-json';
import { SerializationFunction } from '../../persistence/serialization/serializer';
import { Logger } from '../../util/logging/logger';

/**
 * Store of metadata information about supported property types
 */
export class ModelPropertyTypeLibrary {
  private static readonly NO_OP_VALIDATOR: () => undefined = () => undefined;

  private readonly propertyTypeMap: Map<string, ModelPropertyTypeMetadata> = new Map();

  public constructor(private readonly logger: Logger) {}

  /**
   * Registers the provided property type. No action is taken if the property type has
   * already been registered
   */
  public registerPropertyType(propertyTypeData: ModelPropertyTypeRegistrationInformation): void {
    if (this.propertyTypeMap.has(propertyTypeData.type)) {
      this.logger.error(`Property type has already been registered: [${propertyTypeData.type}]`);

      return;
    }
    this.propertyTypeMap.set(
      propertyTypeData.type,
      this.convertPropertyTypeRegistrationInfoToMetadata(propertyTypeData)
    );
  }

  /**
   * Retrieves the validator function for the provided property type. Returns NO-OP validator
   * if the property type has not been registered.
   */
  public getValidator(type: string | ModelPropertyTypeInstance): PropertyValidatorFunction {
    const metadata = this.getMetadataOrLog(type);

    return metadata ? metadata.validator : ModelPropertyTypeLibrary.NO_OP_VALIDATOR;
  }

  /**
   * Retrieves the customer serializer function for the provided property type. Returns undefined if
   * the property type has not been registered, or if no serializer exists.
   */
  public getPropertySerializer<TDeserialized = unknown, TSerialized extends JsonPrimitive = JsonPrimitive>(
    type: string | ModelPropertyTypeInstance
  ): SerializationFunction<TDeserialized, TSerialized> | undefined {
    const metadata = this.getMetadataOrLog(type);

    return metadata && (metadata.serializer as SerializationFunction<TDeserialized, TSerialized>);
  }

  /**
   * Retrieves the customer deserializer function for the provided property type. Returns undefined if
   * the property type has not been registered, or if no deserializer exists.
   */
  public getPropertyDeserializer<TSerialized extends JsonPrimitive = JsonPrimitive, TDeserialized = unknown>(
    type: string | ModelPropertyTypeInstance
  ): DeserializationFunction<TSerialized, TDeserialized> | undefined {
    const metadata = this.getMetadataOrLog(type);

    return metadata && (metadata.deserializer as DeserializationFunction<TSerialized, TDeserialized>);
  }

  private convertPropertyTypeRegistrationInfoToMetadata(
    registrationInfo: ModelPropertyTypeRegistrationInformation
  ): ModelPropertyTypeMetadata {
    return {
      validator: this.bindPotentialFunction(registrationInfo, 'validator') || ModelPropertyTypeLibrary.NO_OP_VALIDATOR,
      serializer: this.bindPotentialFunction(registrationInfo, 'serializer'),
      deserializer: this.bindPotentialFunction(registrationInfo, 'deserializer')
    };
  }

  private getMetadataOrLog(type: string | ModelPropertyTypeInstance): ModelPropertyTypeMetadata | undefined {
    const typeKey = this.typeToKey(type);
    if (this.propertyTypeMap.has(typeKey)) {
      return this.propertyTypeMap.get(typeKey)!;
    }
    this.logger.warn(`Requested property type has not been registered: ${typeKey}`);
  }

  private typeToKey(type: string | ModelPropertyTypeInstance): string {
    return typeof type === 'string' ? type : type.key;
  }

  // tslint:disable-next-line: ban-types
  private bindPotentialFunction<P extends Exclude<keyof ModelPropertyTypeRegistrationInformation, 'type'>>(
    object: ModelPropertyTypeRegistrationInformation,
    key: P
  ): ModelPropertyTypeRegistrationInformation[P] {
    const potentialFunction = object[key];
    // tslint:disable-next-line: strict-type-predicates
    if (typeof potentialFunction === 'function') {
      return potentialFunction.bind(object) as ModelPropertyTypeRegistrationInformation[P];
    }

    return potentialFunction;
  }
}

/**
 * Registration information for a Model Property Type
 */
// tslint:disable-next-line: max-line-length
export interface ModelPropertyTypeRegistrationInformation<
  TDeserialized = unknown,
  TSerialized extends JsonPrimitive = JsonPrimitive
> {
  /**
   * The type key
   */
  type: string;
  /**
   * A potential validator for properties of this type
   */
  validator?: PropertyValidatorFunction;
  /**
   * A custom serializer for this property type. If defined, this will take precedence over the general
   * serialization search
   */
  serializer?: SerializationFunction<TDeserialized, TSerialized>;
  /**
   * A custom deserializer for this property type. If defined, this will take precedence over the general
   * deserialization search
   */
  deserializer?: DeserializationFunction<TSerialized, TDeserialized>;
}

/**
 * Represents an instance of a model property type
 */
export interface ModelPropertyTypeInstance {
  /**
   * The type key represented
   */
  key: string;
}

/**
 *  A validator function that returns a `string` with an error message if validation fails, else `undefined`
 *  Accepts the value to check, which should be in its serialized form, and a flag indicating whether
 *  null or undefined values are allowed.
 *
 */
export type PropertyValidatorFunction = (
  serializedValue: unknown,
  allowUndefinedOrNull: boolean,
  propertyTypeInstance: ModelPropertyTypeInstance
) => string | undefined;

interface ModelPropertyTypeMetadata {
  /**
   * A validator for this property type or potentially a default
   */
  validator: PropertyValidatorFunction;
  /**
   * An optional serializations function for this property type
   */
  serializer: SerializationFunction | undefined;
  /**
   * An optional deserialization function for this property type
   */
  deserializer: DeserializationFunction | undefined;
}
