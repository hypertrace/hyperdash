import { DataSource, ModelJsonWithData } from '../../../data/data-source/data-source';
import { DataSourceManager } from '../../../data/data-source/manager/data-source-manager';
import { ModelManager } from '../../../model/manager/model-manager';
import { ModelPropertyTypeLibrary } from '../../../model/property/model-property-type-library';
import { PropertyLocation } from '../../../model/property/property-location';
import { ModelLibrary, ModelPropertyMetadata } from '../../../model/registration/model-registration';
import { ModelJsonWithTheme, Theme } from '../../../theming/theme';
import { ThemeManager } from '../../../theming/theme-manager';
import { ObjectConstructable } from '../../../util/constructable';
import { ModelJson } from '../../model-json';
import { SerializationManager } from '../serialization-manager';
import { SerializationFunction, Serializer } from '../serializer';

/**
 * Handles serializaation of a model object into a dehydrated
 * JSON representation
 */
export class ModelSerializer implements Serializer<object, ModelJson> {
  public constructor(
    private readonly modelManager: ModelManager,
    private readonly modelLibrary: ModelLibrary,
    private readonly serializationManager: SerializationManager,
    private readonly dataSourceManager: DataSourceManager,
    private readonly themeManager: ThemeManager,
    private readonly modelPropertyTypeLibrary: ModelPropertyTypeLibrary
  ) {}

  /**
   * @inheritdoc
   */
  public canSerialize(value: unknown): value is object {
    return this.modelManager.isTrackedModel(value);
  }

  /**
   * @inheritdoc
   */
  public serialize<T extends object>(modelObject: T): ModelJson {
    const modelClass = modelObject.constructor as ObjectConstructable;
    const modelJson: ModelJson = {
      type: this.modelLibrary.lookupModelMetadata(modelClass)!.type
    };

    this.modelLibrary.lookupModelProperties(modelClass).forEach((propMetdata: ModelPropertyMetadata<T>) => {
      const serializedValue = this.getSerializationFunctionForProperty<T[keyof T], T>(propMetdata)(
        modelObject[propMetdata.runtimeKey],
        PropertyLocation.forModelProperty(modelObject, propMetdata.runtimeKey),
        propMetdata.type
      );
      if (serializedValue !== undefined) {
        modelJson[propMetdata.key] = serializedValue;
      }
    });

    this.serializeThemeIfExists(modelJson, modelObject);
    this.serializeDataIfExists(modelJson, modelObject);

    return modelJson;
  }

  private serializeThemeIfExists(modelJson: ModelJson, modelObject: object): void {
    const theme = this.themeManager.getThemeOverrideObjectProvidedByModel(modelObject);
    if (theme) {
      const serializedTheme = this.serializationManager.serialize<Theme, ModelJson>(
        theme,
        this.themeManager.getPropertyLocationForTheme(modelObject)
      );

      (modelJson as ModelJsonWithTheme).theme = serializedTheme;
    }
  }

  private serializeDataIfExists(modelJson: ModelJson, modelObject: object): void {
    const dataSource = this.dataSourceManager.get(modelObject);
    if (dataSource) {
      const serializedDataSource = this.serializationManager.serialize<DataSource<unknown>, ModelJson>(
        dataSource,
        this.dataSourceManager.getPropertyLocationForData(modelObject)
      );
      (modelJson as ModelJsonWithData).data = serializedDataSource;
    }
  }

  // tslint:disable-next-line: max-line-length
  private getSerializationFunctionForProperty<TDeserialized, TParent extends object>(
    metadata: ModelPropertyMetadata<TParent>
  ): SerializationFunction<TDeserialized> {
    const propertyTypeOverride = this.modelPropertyTypeLibrary.getPropertySerializer<TDeserialized>(metadata.type);
    const defaultSerialization = this.serializationManager.serialize.bind(this.serializationManager);

    return propertyTypeOverride ?? defaultSerialization;
  }
}
