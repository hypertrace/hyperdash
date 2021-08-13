import { cloneDeep, defaults, startCase } from 'lodash-es';
import { Constructable, ObjectConstructable, UnknownConstructable } from '../../util/constructable';
import { Logger } from '../../util/logging/logger';
import { getReflectedPropertyType } from '../../util/reflection/reflection-utilities';
import { ModelPropertyTypeInstance } from '../property/model-property-type-library';
import { deferredModelDecoratorRegistrations } from './model-decorators';

/**
 * Model Library represents a story of metadata information describing the models in the system and their properties.
 */
export class ModelLibrary {
  private readonly modelConstructorByType: Map<string, ObjectConstructable> = new Map();
  private readonly modelClassMetadata: Map<ObjectConstructable, ModelClassMetadata> = new Map();
  private readonly modelPropertyMetadata: Map<
    ObjectConstructable,
    Map<string, ModelPropertyMetadata<object>>
  > = new Map();

  private lastDeferredIndexRead: number = 0;
  private currentlyProcessingDeferred: boolean = false;

  public constructor(private readonly logger: Logger) {}

  /**
   * Registers a model class with the provieded information
   *
   * No action is taken if the model class or type has already been registered
   */
  public registerModelClass(
    modelClass: ObjectConstructable,
    registrationInformation: ModelRegistrationInformation
  ): void {
    this.processRegistrationQueue();
    this.trackNewModelType(modelClass, registrationInformation.type);

    if (this.modelClassMetadata.has(modelClass)) {
      this.logger.error(`Model classes may not be registered more than once: ${modelClass.name}`);

      return;
    }

    this.modelClassMetadata.set(modelClass, this.convertModelRegistrationInfoToMetadata(registrationInformation));
  }

  /**
   * Associates a model property identified by the provided key with a model class.
   *
   * No action is taken if the property key has already been registered
   */
  public registerModelProperty<T extends object>(
    modelClass: Constructable<T>,
    runtimeKey: keyof T,
    registrationInfo: ModelPropertyRegistrationInformation
  ): void {
    this.processRegistrationQueue();
    const propertyKey = registrationInfo.key;
    if (!this.modelPropertyMetadata.has(modelClass)) {
      this.modelPropertyMetadata.set(modelClass, new Map());
    }
    const propertyMetadataSet = this.modelPropertyMetadata.get(modelClass)!;

    if (propertyMetadataSet.has(propertyKey)) {
      this.logger.error(`Model properties may not be registered more than once: ${modelClass.name}.${propertyKey}`);

      return;
    }

    propertyMetadataSet.set(
      propertyKey,
      this.convertPropertyRegistrationToMetadata(runtimeKey, registrationInfo, modelClass) as ModelPropertyMetadata<
        object
      >
    );
  }

  /**
   * Looks up and returns the constructor of the model class associated with the provided string.
   * Returns undefined if no class is found.
   */
  public lookupModelClass(modelType: string): ObjectConstructable | undefined {
    this.processRegistrationQueue();
    if (this.modelConstructorByType.has(modelType)) {
      return this.modelConstructorByType.get(modelType)!;
    }
    this.logger.info(`No class registered matching type: ${modelType}`);

    return undefined;
  }

  /**
   * Looks up and returns the model metadata for the provided model class.
   * Returns undefined if no type is found.
   */
  public lookupModelMetadata(modelClass: ObjectConstructable): ModelClassMetadata | undefined {
    this.processRegistrationQueue();
    if (this.modelClassMetadata.has(modelClass)) {
      return this.modelClassMetadata.get(modelClass)!;
    }
    this.logger.info(`No type registered matching class: ${modelClass.name}`);

    return undefined;
  }

  /**
   * Returns an array of properties registered to the provided model class.
   *
   * Returns empty array if class is not found.
   */
  public lookupModelProperties<T extends object>(modelClass: Constructable<T>): ModelPropertyMetadata<T>[] {
    this.processRegistrationQueue();
    const modelProperties: ModelPropertyMetadata<T>[] = [];

    this.getMetadataChain(modelClass, this.modelPropertyMetadata).forEach(propertyMetadataMap => {
      Array.from(propertyMetadataMap.values())
        .map(cloneDeep)
        .forEach(propertyMetadata => modelProperties.push(propertyMetadata));
    });

    return modelProperties;
  }

  /**
   * Returns all model classes that contain `modelClass` on their prototype chain, including
   * the provided class if registered.
   */
  public getAllCompatibleModelClasses(modelClass: ObjectConstructable): ObjectConstructable[] {
    this.processRegistrationQueue();

    return Array.from(this.modelClassMetadata.keys()).filter(
      registeredClass => registeredClass === modelClass || registeredClass.prototype instanceof modelClass
    );
  }

  private trackNewModelType(modelClass: ObjectConstructable, modelType: string): void {
    if (this.modelConstructorByType.has(modelType)) {
      this.logger.error(`Model types may not be registered more than once: ${modelType}`);

      return;
    }

    if (!this.modelPropertyMetadata.has(modelClass)) {
      // Model property should be empty in case no properties were registered
      this.modelPropertyMetadata.set(modelClass, new Map());
    }

    this.modelConstructorByType.set(modelType, modelClass);
  }

  private convertModelRegistrationInfoToMetadata(registrationInfo: ModelRegistrationInformation): ModelClassMetadata {
    return {
      type: registrationInfo.type,
      displayName: registrationInfo.displayName ?? this.formatAsDisplayName(registrationInfo.type),
      supportedDataSourceTypes: registrationInfo.supportedDataSourceTypes ?? []
    };
  }

  /**
   * Each discovered metadata object, in descending order (i.e. `[modelClassParent, modelClass]`)
   */
  private getMetadataChain<T>(modelClass: ObjectConstructable, metadataMap: Map<ObjectConstructable, T>): T[] {
    const metadataChain = [];
    let constructor: ObjectConstructable | undefined = modelClass;
    while (constructor) {
      if (metadataMap.has(constructor)) {
        metadataChain.unshift(metadataMap.get(constructor)!);
      }
      constructor = Object.getPrototypeOf(constructor) as ObjectConstructable | undefined;
    }

    return metadataChain;
  }

  private convertPropertyRegistrationToMetadata<V extends object>(
    propertyKey: keyof V,
    registrationInfo: ModelPropertyRegistrationInformation,
    modelClass: Constructable<V>
  ): ModelPropertyMetadata<V> {
    const registrationInfoWithConvertedType = {
      ...registrationInfo,
      type: typeof registrationInfo.type === 'string' ? { key: registrationInfo.type } : { ...registrationInfo.type }
    };

    return defaults(registrationInfoWithConvertedType, {
      displayName: this.formatAsDisplayName(registrationInfo.key),
      required: false,
      runtimeKey: propertyKey,
      runtimeType: getReflectedPropertyType(modelClass, propertyKey)
    });
  }

  private processRegistrationQueue(): void {
    if (this.currentlyProcessingDeferred) {
      return; // Lazy shortcut lock to prevent infinitely looping on this
    }
    this.currentlyProcessingDeferred = true;
    // tslint:disable-next-line:max-line-length
    for (
      this.lastDeferredIndexRead;
      this.lastDeferredIndexRead < deferredModelDecoratorRegistrations.length;
      this.lastDeferredIndexRead++
    ) {
      const deferredRegistration = deferredModelDecoratorRegistrations[this.lastDeferredIndexRead];
      deferredRegistration(this);
    }
    this.currentlyProcessingDeferred = false;
  }

  private formatAsDisplayName(input: string): string {
    return startCase(input);
  }
}

/**
 * Registration information for a model property
 */
export interface ModelPropertyRegistrationInformation {
  /**
   * Key used for serializing/deserializing this model property
   */
  key: string;

  /**
   * When displaying in an editor, use this name.
   * Defaults to key value converted to Start Case.
   * Underscores, dashes and camel casing is all converted to spaces. Trailing and leading spaces
   * are removed, and the first letter of each word is capitalized.
   * i.e. my-special_key => My Special Key
   */
  displayName?: string;

  /**
   * See `ModelPropertyTypeLibrary`
   * An extensible string or object value that dictates the type of this property (for editing and validation)
   */
  type: ModelPropertyTypeInstance | string;

  /**
   * Is this property required to be set? If so, the editor will require it and validation will fail if missing
   * Defaults to false
   */
  required?: boolean;
}
/**
 * Registration information for a model class
 */
export interface ModelRegistrationInformation {
  /**
   * Key used for serializing/deserializing this model class
   */
  readonly type: string;

  /**
   * When displaying in an editor, use this name.
   * Defaults to type value converted to Start Case.
   * Underscores, dashes and camel casing is all converted to spaces. Trailing and leading spaces
   * are removed, and the first letter of each word is capitalized.
   * i.e. my-special_type => My Special Type
   */
  displayName?: string;

  /**
   * Model type for data source expected by this model
   */
  supportedDataSourceTypes?: ObjectConstructable[];
}

interface ModelClassMetadata extends Required<ModelRegistrationInformation> {}

/**
 * Model Property metadata after all defaults have been applied
 */
export interface ModelPropertyMetadata<T> extends Required<ModelPropertyRegistrationInformation> {
  /**
   * Name of the property key at runtime
   */
  runtimeKey: keyof T;

  /**
   * Constructor of type at runtime
   */
  runtimeType: UnknownConstructable | undefined;

  /**
   * An object containing property type metadata for this property.
   */
  type: ModelPropertyTypeInstance;
}
