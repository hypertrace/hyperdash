import { Logger } from '../../util/logging/logger';
import {
  ModelPropertyTypeLibrary,
  ModelPropertyTypeRegistrationInformation,
  PropertyValidatorFunction
} from './model-property-type-library';
import { BOOLEAN_PROPERTY } from './predefined/primitive-model-property-types';
import { PropertyLocation } from './property-location';

describe('Model property type library', () => {
  let library: ModelPropertyTypeLibrary;
  let mockLogger: Partial<Logger>;

  beforeEach(() => {
    mockLogger = {};
    library = new ModelPropertyTypeLibrary(mockLogger as Logger);
  });

  const expectIsDefaultValidator = (validator: unknown) => {
    expect(typeof validator).toBe('function');

    expect(
      // tslint:disable-next-line: no-null-keyword
      ['t', true, 0, Symbol(''), undefined, null, [], {}]
        .map(value => (validator as PropertyValidatorFunction)(value, false, { key: 'any' }))
        .every(val => val === undefined)
    ).toBeTruthy();
  };

  test('can register properties', () => {
    const propertyType = {
      type: 'test',
      validator: jest.fn()
    };

    library.registerPropertyType(propertyType);
    expect(library.getValidator('test')).toEqual(expect.any(Function));
  });

  test('can retrieve bound validator', () => {
    const propertyType = new (class implements ModelPropertyTypeRegistrationInformation {
      public type: string = 'test';
      private readonly internalProperty: string = 'internalValidator';
      public validator(): string {
        return this.internalProperty;
      }
    })();

    library.registerPropertyType(propertyType);
    const validator = library.getValidator('test');
    expect(validator('value', true, { key: 'test' })).toBe('internalValidator');
  });

  test('defaults validator if undefined', () => {
    library.registerPropertyType({
      type: 'test'
    });

    expectIsDefaultValidator(library.getValidator('test'));
  });

  test('logs error if registering property twice', () => {
    mockLogger.error = jest.fn();
    library.registerPropertyType(BOOLEAN_PROPERTY);
    library.registerPropertyType(BOOLEAN_PROPERTY);
    expect(mockLogger.error).toHaveBeenCalledWith('Property type has already been registered: [boolean]');
  });

  test('logs and returns default on lookup if property type not registered', () => {
    mockLogger.warn = jest.fn();

    expectIsDefaultValidator(library.getValidator('fake'));

    expect(mockLogger.warn).toHaveBeenCalledWith('Requested property type has not been registered: fake');
  });

  test('can retrieve bound serializer', () => {
    const propertyType = new (class implements ModelPropertyTypeRegistrationInformation {
      public type: string = 'test';
      private readonly internalProperty: string = 'internalSerializer';
      public serializer(): string {
        return this.internalProperty;
      }
    })();

    library.registerPropertyType(propertyType);
    const location = PropertyLocation.forModelProperty({ exampleProp: undefined as unknown }, 'exampleProp');
    const serializer = library.getPropertySerializer('test');
    expect(serializer!('value', location, { key: 'test' })).toBe('internalSerializer');
  });

  test('retrieves undefined for serializer if not defined or not registered', () => {
    mockLogger.warn = jest.fn();
    expect(library.getPropertySerializer('test')).toBeUndefined();
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);

    const propertyType = {
      type: 'test'
    };
    library.registerPropertyType(propertyType);
    expect(library.getPropertySerializer('test')).toBeUndefined();
    expect(mockLogger.warn).toHaveBeenCalledTimes(1); // Not called again
  });

  test('can retrieve bound deserializer', () => {
    const propertyType = new (class implements ModelPropertyTypeRegistrationInformation {
      public type: string = 'test';
      private readonly internalProperty: string = 'internalDeserializer';
      public deserializer(): string {
        return this.internalProperty;
      }
    })();

    library.registerPropertyType(propertyType);
    const location = PropertyLocation.forModelProperty({ exampleProp: undefined as unknown }, 'exampleProp');
    const deserializer = library.getPropertyDeserializer('test');
    expect(deserializer!('value', location, { key: 'test' })).toBe('internalDeserializer');
  });

  test('retrieves undefined for deserializer if not defined or not registered', () => {
    mockLogger.warn = jest.fn();
    expect(library.getPropertyDeserializer('test')).toBeUndefined();
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);

    const propertyType = {
      type: 'test'
    };
    library.registerPropertyType(propertyType);
    expect(library.getPropertyDeserializer('test')).toBeUndefined();
    expect(mockLogger.warn).toHaveBeenCalledTimes(1); // Not called again
  });

  test('can retrieve by model type instance', () => {
    const propertyType = {
      type: 'test',
      validator: () => undefined
    };

    library.registerPropertyType(propertyType);
    expect(library.getValidator({ key: 'test' })).toEqual(expect.any(Function));
  });
});
