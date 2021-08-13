import { DataSourceManager } from '../../../data/data-source/manager/data-source-manager';
import { ModelManager } from '../../../model/manager/model-manager';
import { ModelPropertyTypeLibrary } from '../../../model/property/model-property-type-library';
import { PropertyLocation } from '../../../model/property/property-location';
import { ModelPropertyValidator } from '../../../model/property/validation/model-property-validator';
import { ModelLibrary, ModelPropertyMetadata } from '../../../model/registration/model-registration';
import { ThemeManager } from '../../../theming/theme-manager';
import { Constructable } from '../../../util/constructable';
import { Logger } from '../../../util/logging/logger';
import { VariableManager } from '../../../variable/manager/variable-manager';
import { JsonPrimitive, ModelJson } from '../../model-json';
import { DeserializationManager } from '../deserialization-manager';
import { DeserializationFunction, Deserializer } from '../deserializer';

/**
 * Handles deserialization of a JSON object with a registered type property,
 * instantiating the associated model class
 */
export class ModelDeserializer implements Deserializer<ModelJson, object> {
  public constructor(
    private readonly deserializationManager: DeserializationManager,
    private readonly modelLibrary: ModelLibrary,
    private readonly modelManager: ModelManager,
    private readonly modelPropertyValidator: ModelPropertyValidator,
    private readonly logger: Logger,
    private readonly dataSourceManager: DataSourceManager,
    private readonly variableManager: VariableManager,
    private readonly themeManager: ThemeManager,
    private readonly modelPropertyTypeLibrary: ModelPropertyTypeLibrary
  ) {}

  /**
   * @inheritdoc
   */
  public canDeserialize(json: JsonPrimitive): json is ModelJson {
    return this.isObjectWithTypeProperty(json) && this.isRegisteredModelType(json.type);
  }

  /**
   * @inheritdoc
   */
  public deserialize(json: ModelJson, location?: PropertyLocation<object>): object {
    const modelClass = this.modelLibrary.lookupModelClass(json.type)!;
    const parentModel = location && location.parentModel;

    const instance = this.modelManager.construct(modelClass as Constructable<{ [key: string]: unknown }>, parentModel);

    this.modelLibrary.lookupModelProperties(modelClass).forEach(propMetdata => {
      const serializedValue = json[propMetdata.key];
      this.validateProperty(serializedValue, propMetdata);
      try {
        const deserializedValue = this.getDeserializationFunctionForProperty(propMetdata)(
          serializedValue,
          PropertyLocation.forModelProperty(instance, propMetdata.runtimeKey).withValidator(valueToValidate =>
            // Currently variables are allowed to be undefined. May change this in the future
            this.modelPropertyValidator.validate(valueToValidate, { ...propMetdata, required: false })
          ),
          propMetdata.type
        );
        if (deserializedValue !== undefined) {
          instance[propMetdata.runtimeKey] = deserializedValue;
        }
      } catch (untypedErr) {
        return this.logger.error(`Error deserializing property [${propMetdata.key}]`, untypedErr as Error).throw();
      }
    });

    if (this.dataSourceManager.modelJsonHasData(json)) {
      const dataLocation = this.dataSourceManager.getPropertyLocationForData(instance);
      dataLocation.setProperty(this.deserializationManager.deserialize(json.data, dataLocation));
    }

    if (this.themeManager.modelJsonHasTheme(json)) {
      const themeLocation = this.themeManager.getPropertyLocationForTheme(instance);
      themeLocation.setProperty(this.deserializationManager.deserialize(json.theme, themeLocation));
    }

    this.modelManager.initialize(instance);

    return instance;
  }

  private getDeserializationFunctionForProperty(metadata: ModelPropertyMetadata<object>): DeserializationFunction {
    const propertyTypeOverride = this.modelPropertyTypeLibrary.getPropertyDeserializer(metadata.type);
    const defaultDeserialize = this.deserializationManager.deserialize.bind(this.deserializationManager);

    return propertyTypeOverride ?? (defaultDeserialize as DeserializationFunction);
  }

  private isObjectWithTypeProperty(json?: JsonPrimitive): json is ModelJson {
    return (
      typeof json === 'object' &&
      json !== null &&
      Object.getPrototypeOf(json) === Object.prototype &&
      'type' in json &&
      (typeof json.type as unknown) === 'string'
    );
  }

  private isRegisteredModelType(modelType: string): boolean {
    return !!this.modelLibrary.lookupModelClass(modelType);
  }

  private validateProperty(value: unknown, propertyMetadata: ModelPropertyMetadata<object>): void {
    if (typeof value === 'string' && this.variableManager.isVariableExpression(value)) {
      return; // Variable expressions are validated at resolve time
    }
    this.modelPropertyValidator.validate(value, propertyMetadata);
  }
}
