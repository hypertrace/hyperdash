import { mapValues } from 'lodash-es';
import { DataSourceManager } from '../../../data/data-source/manager/data-source-manager';
import { ModelManager } from '../../../model/manager/model-manager';
import {
  ModelPropertyTypeInstance,
  ModelPropertyTypeLibrary
} from '../../../model/property/model-property-type-library';
import { PropertyLocation } from '../../../model/property/property-location';
import { ModelPropertyValidator } from '../../../model/property/validation/model-property-validator';
import { ModelLibrary } from '../../../model/registration/model-registration';
import { PartialObjectMock } from '../../../test/partial-object-mock';
import { ThemeManager } from '../../../theming/theme-manager';
import { Logger } from '../../../util/logging/logger';
import { VariableManager } from '../../../variable/manager/variable-manager';
import { DeserializationManager } from '../deserialization-manager';
import { ModelDeserializer } from './model-deserializer';

describe('Model deserializer', () => {
  let deserializer: ModelDeserializer;
  let mockDeserializationManager: PartialObjectMock<DeserializationManager>;
  let mockModelLibrary: PartialObjectMock<ModelLibrary>;
  let mockModelManager: PartialObjectMock<ModelManager>;
  let mockModelPropertyValidator: PartialObjectMock<ModelPropertyValidator>;
  let mockLogger: PartialObjectMock<Logger>;
  let mockDataSourceManager: PartialObjectMock<DataSourceManager>;
  let mockVariableManager: PartialObjectMock<VariableManager>;
  let mockThemeManager: PartialObjectMock<ThemeManager>;
  let mockModelPropertyTypeLibrary: PartialObjectMock<ModelPropertyTypeLibrary>;

  const valuesToTest = {
    string: 'string',
    number: 15,
    boolean: true,
    date: new Date(),
    // tslint:disable-next-line:no-null-keyword
    null: null,
    undefined: undefined,
    object: { test: 'test' },
    array: [],
    instance: new (class ExampleClass {})(),
    registeredModel: {
      type: 'registered',
      first: 'first',
      second: 'second'
    },
    unregisteredModel: {
      type: 'unregistered'
    }
  };

  const testClass = class {
    public constructor(public readonly runtimeProp?: string) {}
  };

  const parent = new (class {
    public childProp!: object;
  })();
  const parentLocation = PropertyLocation.forModelProperty(parent, 'childProp');

  beforeEach(() => {
    mockDeserializationManager = {
      deserialize: jest.fn().mockReturnValue('deserialized')
    };
    mockModelLibrary = {
      lookupModelClass: jest.fn().mockReturnValue(testClass),
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
    mockModelManager = {
      construct: jest.fn().mockImplementation(() => new testClass()),
      initialize: jest.fn().mockImplementation((model: unknown) => model)
    };

    mockModelPropertyValidator = {
      validate: jest.fn()
    };

    mockLogger = {};

    mockDataSourceManager = {
      attach: jest.fn(),
      detach: jest.fn(),
      modelJsonHasData: jest.fn()
    };

    mockVariableManager = {
      isVariableExpression: () => false
    };

    mockThemeManager = {
      modelJsonHasTheme: jest.fn()
    };

    mockModelPropertyTypeLibrary = {
      getPropertyDeserializer: jest.fn()
    };

    deserializer = new ModelDeserializer(
      mockDeserializationManager as DeserializationManager,
      mockModelLibrary as ModelLibrary,
      mockModelManager as ModelManager,
      mockModelPropertyValidator as ModelPropertyValidator,
      mockLogger as Logger,
      mockDataSourceManager as DataSourceManager,
      mockVariableManager as VariableManager,
      mockThemeManager as ThemeManager,
      mockModelPropertyTypeLibrary as ModelPropertyTypeLibrary
    );
  });

  test('should support model json only', () => {
    mockModelLibrary.lookupModelClass = jest.fn().mockImplementation(type => {
      if (type === 'registered') {
        return class {};
      }

      return undefined;
    });

    expect(mapValues(valuesToTest, value => deserializer.canDeserialize(value))).toEqual({
      string: false,
      number: false,
      boolean: false,
      date: false,
      null: false,
      undefined: false,
      object: false,
      array: false,
      instance: false,
      registeredModel: true,
      unregisteredModel: false
    });
  });

  test('should deserialize into specified model class', () => {
    const result = deserializer.deserialize(
      {
        type: 'registered',
        prop: 'serialized',
        random: 'should not be deserialized'
      },
      parentLocation
    );

    expect(result).toEqual(new testClass('deserialized'));

    expect(mockModelManager.construct).toHaveBeenCalledTimes(1);

    expect(mockModelManager.construct).toHaveBeenCalledWith(testClass, parent);

    expect(mockDeserializationManager.deserialize).toHaveBeenCalledTimes(1);

    expect(mockDeserializationManager.deserialize).toHaveBeenCalledWith(
      'serialized',
      expect.objectContaining({
        propertyKey: 'runtimeProp',
        parentModel: result
      }),
      { key: 'runtime-prop-type' }
    );
  });

  test('populates properties before init has been called', () => {
    mockModelManager.initialize = jest
      .fn()
      .mockImplementation((model: unknown) => expect(model).toEqual(new testClass('deserialized')));

    deserializer.deserialize({
      type: 'registered',
      prop: 'serialized'
    });

    expect(mockModelManager.initialize).toHaveBeenCalledTimes(1);
  });

  test('deserializes data property', () => {
    const dataObj = {};
    const mockDataLocation = {
      setProperty: jest.fn()
    };
    mockDeserializationManager.deserialize = jest.fn().mockImplementation((serialized: unknown) => {
      if (serialized === dataObj) {
        return dataObj;
      }

      return 'deserialized';
    });

    mockDataSourceManager.modelJsonHasData = jest
      .fn()
      // tslint:disable-next-line:no-any
      .mockReturnValueOnce(true) as any;

    mockDataSourceManager.getPropertyLocationForData = jest.fn().mockReturnValueOnce(mockDataLocation);

    const result = deserializer.deserialize({
      type: 'registered',
      prop: 'serialized',
      data: dataObj
    });

    expect(result).toEqual(new testClass('deserialized'));

    expect(mockDeserializationManager.deserialize).toHaveBeenCalledWith(dataObj, mockDataLocation);
    expect(mockDataLocation.setProperty).toHaveBeenCalledWith(dataObj);
  });

  test('deserializes theme property', () => {
    const themeObj = {};
    const mockThemeLocation = {
      setProperty: jest.fn()
    };

    mockDeserializationManager.deserialize = jest.fn().mockImplementation((serialized: unknown) => {
      if (serialized === themeObj) {
        return themeObj;
      }

      return 'deserialized';
    });
    mockThemeManager.modelJsonHasTheme = jest
      .fn()
      // tslint:disable-next-line:no-any
      .mockReturnValueOnce(true) as any;

    mockThemeManager.getPropertyLocationForTheme = jest.fn().mockReturnValueOnce(mockThemeLocation);

    const result = deserializer.deserialize({
      type: 'registered',
      prop: 'serialized',
      theme: themeObj
    });

    expect(result).toEqual(new testClass('deserialized'));

    expect(mockDeserializationManager.deserialize).toHaveBeenCalledWith(themeObj, mockThemeLocation);
    expect(mockThemeLocation.setProperty).toHaveBeenCalledWith(themeObj);
  });

  test('does not overwrite undefined properties', () => {
    const defaultedClass = class {
      public constructor(public readonly runtimeProp?: string, public other: string = 'default') {}
    };

    mockModelLibrary.lookupModelClass = jest.fn().mockReturnValue(defaultedClass);

    mockModelLibrary.lookupModelProperties = jest.fn().mockReturnValue(
      new Set([
        {
          key: 'prop',
          runtimeKey: 'runtimeProp',
          required: true
        },
        {
          key: 'other',
          runtimeKey: 'other'
        }
      ])
    );

    mockModelManager.construct = jest.fn().mockImplementation(() => new defaultedClass());

    mockDeserializationManager.deserialize = jest.fn().mockImplementation((serialized: unknown) => serialized);

    expect(
      deserializer.deserialize({
        type: 'registered',
        prop: 'value'
      })
    ).toEqual(new defaultedClass('value'));

    expect(
      deserializer.deserialize({
        type: 'registered',
        prop: 'value',
        other: 'not default'
      })
    ).toEqual(new defaultedClass('value', 'not default'));
  });

  test('skips validation for variables', () => {
    mockVariableManager.isVariableExpression = jest.fn().mockReturnValue((val: string) => val.startsWith('$'));
    deserializer.deserialize({
      type: 'registered',
      // tslint:disable-next-line:no-invalid-template-strings
      prop: '${test}',
      random: 'other'
    });

    expect(mockModelPropertyValidator.validate).not.toHaveBeenCalled();
  });

  test('requests validation for regular properties', () => {
    deserializer.deserialize({
      type: 'registered',
      prop: 'serialized',
      random: 'should not be deserialized'
    });

    expect(mockModelPropertyValidator.validate).toHaveBeenCalledTimes(1);
    expect(mockModelPropertyValidator.validate).nthCalledWith(
      1,
      'serialized',
      expect.objectContaining({
        key: 'prop',
        runtimeKey: 'runtimeProp'
      })
    );
  });

  test('creates valid locations for deserialized properties', () => {
    const result = deserializer.deserialize({
      type: 'registered',
      prop: 'serialized'
    }) as { [key: string]: string };

    const location = (mockDeserializationManager.deserialize as jest.Mock).mock.calls[0][1] as PropertyLocation;

    // Setter should assign to runtimeProp, not prop
    location.setProperty('newVal');

    expect(result.runtimeProp).toBe('newVal');
  });

  test('adds validation to property locations', () => {
    expect(() =>
      deserializer.deserialize({
        type: 'registered',
        prop: 'serialized'
      })
    ).not.toThrow();

    const location = (mockDeserializationManager.deserialize as jest.Mock).mock.calls[0][1] as PropertyLocation;

    location.setProperty('unvalidated');

    expect(mockModelPropertyValidator.validate).toHaveBeenCalledWith(
      'unvalidated',
      expect.objectContaining({
        key: 'prop',
        runtimeKey: 'runtimeProp'
      })
    );
  });

  test('thows error for nested validation errors', () => {
    mockLogger.error = jest.fn((message: string) => ({
      throw: () => {
        throw Error(message);
      }
    }));

    mockModelPropertyValidator.validate = jest.fn().mockImplementation((val: unknown) => {
      if (typeof val === 'string') {
        throw Error('no strings');
      }
    });

    mockDeserializationManager.deserialize = jest
      .fn()
      .mockImplementationOnce(deserializer.deserialize.bind(deserializer));

    expect(() =>
      deserializer.deserialize({
        type: 'registered',
        prop: {
          type: 'registered',
          prop: 'string value'
        }
      })
    ).toThrow('Error deserializing property [prop]');
  });

  test('delegates to custom model property deserializers', () => {
    const mockPropertyDeserializer = jest.fn(() => 'mock custom deserialized property') as jest.Mock;
    mockModelPropertyTypeLibrary.getPropertyDeserializer = jest.fn((type: ModelPropertyTypeInstance) =>
      type.key === 'runtime-prop-type' ? mockPropertyDeserializer : undefined
    );

    expect(
      deserializer.deserialize(
        {
          type: 'registered',
          prop: 'serialized'
        },
        parentLocation
      )
    ).toEqual(new testClass('mock custom deserialized property'));

    expect(mockPropertyDeserializer).toHaveBeenCalledWith('serialized', expect.any(PropertyLocation), {
      key: 'runtime-prop-type'
    });
  });
});
