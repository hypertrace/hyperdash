import { mapValues } from 'lodash';
import { DataSourceManager } from '../../../data/data-source/manager/data-source-manager';
import { ModelManager } from '../../../model/manager/model-manager';
import {
  ModelPropertyTypeInstance,
  ModelPropertyTypeLibrary
} from '../../../model/property/model-property-type-library';
import { PropertyLocation } from '../../../model/property/property-location';
import { ModelLibrary } from '../../../model/registration/model-registration';
import { PartialObjectMock } from '../../../test/partial-object-mock';
import { ThemeManager } from '../../../theming/theme-manager';
import { SerializationManager } from '../serialization-manager';
import { ModelSerializer } from './model-serializer';

describe('Model serializer', () => {
  let serializer: ModelSerializer;
  let mockModelManager: PartialObjectMock<ModelManager>;
  let mockModelLibrary: PartialObjectMock<ModelLibrary>;
  let mockSerializationManager: PartialObjectMock<SerializationManager>;
  let mockDataSourceManager: PartialObjectMock<DataSourceManager>;
  let mockThemeManager: PartialObjectMock<ThemeManager>;
  let mockModelPropertyTypeLibrary: PartialObjectMock<ModelPropertyTypeLibrary>;

  const modelClass = class {
    public constructor(public runtimeProp?: string) {}
  };

  let modelObject: typeof modelClass.prototype;

  beforeEach(() => {
    modelObject = new modelClass('deserialized');
    mockModelManager = {
      isTrackedModel: jest.fn((model: object) => model === modelObject)
    };
    mockModelLibrary = {
      lookupModelMetadata: jest.fn().mockReturnValue({ type: 'model-type' }),
      lookupModelProperties: jest.fn().mockReturnValue(
        new Set([
          {
            key: 'prop',
            runtimeKey: 'runtimeProp',
            type: { key: 'runtime-prop-type' }
          }
        ])
      )
    };
    mockSerializationManager = {
      serialize: jest.fn().mockReturnValue('serialized')
    };
    mockDataSourceManager = {
      get: jest.fn()
    };
    mockThemeManager = {
      getThemeOverrideObjectProvidedByModel: jest.fn()
    };
    mockModelPropertyTypeLibrary = {
      getPropertySerializer: jest.fn()
    };

    serializer = new ModelSerializer(
      mockModelManager as ModelManager,
      mockModelLibrary as ModelLibrary,
      mockSerializationManager as SerializationManager,
      mockDataSourceManager as DataSourceManager,
      mockThemeManager as ThemeManager,
      mockModelPropertyTypeLibrary as ModelPropertyTypeLibrary
    );
  });

  test('should support model objects only', () => {
    const valuesToTest = {
      string: 'string',
      symbol: Symbol('symbol'),
      number: 15,
      boolean: true,
      date: new Date(),
      // tslint:disable-next-line:no-null-keyword
      null: null,
      undefined: undefined,
      object: { test: 'test' },
      array: [],
      nonModelClassInstance: new (class ExampleClass {})(),
      unregisteredModelInstance: new modelClass(),
      modelInstance: modelObject
    };

    expect(mapValues(valuesToTest, value => serializer.canSerialize(value))).toEqual({
      string: false,
      symbol: false,
      number: false,
      boolean: false,
      date: false,
      null: false,
      undefined: false,
      object: false,
      array: false,
      nonModelClassInstance: false,
      unregisteredModelInstance: false,
      modelInstance: true
    });
  });

  test('should serialize model class', () => {
    const result = serializer.serialize(modelObject);

    expect(result).toEqual({
      type: 'model-type',
      prop: 'serialized'
    });
  });

  test('does not write undefined properties to JSON', () => {
    mockSerializationManager.serialize = jest.fn();

    expect(serializer.serialize(modelObject)).toEqual({
      type: 'model-type'
    });
  });

  test('serializes any attached data source', () => {
    const dataObj = {};
    const mockDataLocation = {};

    mockSerializationManager.serialize = jest.fn().mockImplementation((deserialized: unknown) => {
      if (deserialized === dataObj) {
        return { type: 'serialized-data' };
      }

      return 'serialized';
    });

    mockDataSourceManager.get = jest.fn().mockReturnValueOnce(dataObj);

    mockDataSourceManager.getPropertyLocationForData = jest.fn().mockReturnValueOnce(mockDataLocation);

    expect(serializer.serialize(modelObject)).toEqual({
      type: 'model-type',
      prop: 'serialized',
      data: {
        type: 'serialized-data'
      }
    });
    expect(mockSerializationManager.serialize).toHaveBeenCalledWith(dataObj, mockDataLocation);
  });

  test('serializes any associated theme', () => {
    const themeObj = {};
    const mockThemeLocation = {};

    mockSerializationManager.serialize = jest.fn().mockImplementation((deserialized: unknown) => {
      if (deserialized === themeObj) {
        return { type: 'serialized-theme' };
      }

      return 'serialized';
    });

    mockThemeManager.getThemeOverrideObjectProvidedByModel = jest.fn().mockReturnValueOnce(themeObj);

    mockThemeManager.getPropertyLocationForTheme = jest.fn().mockReturnValueOnce(mockThemeLocation);

    expect(serializer.serialize(modelObject)).toEqual({
      type: 'model-type',
      prop: 'serialized',
      theme: {
        type: 'serialized-theme'
      }
    });
    expect(mockSerializationManager.serialize).toHaveBeenCalledWith(themeObj, mockThemeLocation);
  });

  test('creates valid locations for serialized properties', () => {
    spyOn(PropertyLocation, 'forModelProperty'); // Use spy for autoreset
    serializer.serialize(modelObject);

    expect(PropertyLocation.forModelProperty).toHaveBeenCalledWith(modelObject, 'runtimeProp');
  });

  test('delegates to custom model property serializers', () => {
    const mockPropertySerializer = jest.fn(() => 'mock custom serialized property');
    mockModelPropertyTypeLibrary.getPropertySerializer = jest.fn((type: ModelPropertyTypeInstance) =>
      type.key === 'runtime-prop-type' ? mockPropertySerializer : undefined
    ) as jest.Mock;

    expect(serializer.serialize(modelObject)).toEqual({
      type: 'model-type',
      prop: 'mock custom serialized property'
    });

    expect(mockPropertySerializer).toHaveBeenCalledWith('deserialized', expect.any(PropertyLocation), {
      key: 'runtime-prop-type'
    });
  });
});
