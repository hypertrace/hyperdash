import { isNil } from 'lodash-es';
import { DeserializationManager } from '../../../persistence/deserialization/deserialization-manager';
import { ModelJson } from '../../../persistence/model-json';
import { Constructable } from '../../../util/constructable';
import { ModelManager } from '../../manager/model-manager';
import { ModelPropertyTypeInstance, ModelPropertyTypeRegistrationInformation } from '../model-property-type-library';
import { PropertyLocation } from '../property-location';

/**
 * Model properties representing a nested model
 */
export class ModelPropertyType implements ModelPropertyTypeRegistrationInformation<object, ModelJson> {
  /**
   * Type key for model properties
   */
  public static readonly TYPE: string = 'model';

  /**
   * @inheritdoc
   */
  public readonly type: string = ModelPropertyType.TYPE;

  public constructor(
    private readonly deserializationManager: DeserializationManager,
    private readonly modelManager: ModelManager
  ) {}

  /**
   * @inheritdoc
   */
  public validator(value: unknown, allowUndefinedOrNull: boolean): string | undefined {
    if (allowUndefinedOrNull && isNil(value)) {
      return undefined;
    }
    if (isNil(value)) {
      return `Required property got ${value} value`;
    }
    if (typeof value !== 'object') {
      return `Provided value is not model JSON, detected type: ${typeof value}`;
    }
    if (!('type' in value!)) {
      return 'Provided value is missing model JSON required type field';
    }

    return undefined; // Can't detect if type is registered without access to library
  }

  /**
   * @inheritdoc
   */
  public deserializer(
    json: ModelJson | undefined,
    location: PropertyLocation<object>,
    propertyInstance: ModelModelPropertyTypeInstance
  ): object {
    const defaultModelClass = propertyInstance.defaultModelClass;
    if (!json && defaultModelClass) {
      return this.modelManager.create(defaultModelClass, location.parentModel);
    }

    return this.deserializationManager.deserialize(json, location);
  }
}

/**
 * A ModelPropertyType representing another model... yeah.
 */
export interface ModelModelPropertyTypeInstance extends ModelPropertyTypeInstance {
  /**
   * If the property is undefined, by default, use this class
   */
  defaultModelClass?: Constructable<object>;
}
