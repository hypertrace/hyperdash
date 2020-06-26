// tslint:disable:no-null-keyword
import {
  BOOLEAN_PROPERTY,
  NUMBER_PROPERTY,
  PLAIN_OBJECT_PROPERTY,
  STRING_PROPERTY,
  UNKNOWN_PROPERTY
} from './primitive-model-property-types';

describe('Predefined Model Property primitive types', () => {
  const propertyTypeInstance = { key: 'any' }; // Not used by predefined validators

  test('boolean has correct type', () => {
    expect(BOOLEAN_PROPERTY.type).toBe('boolean');
  });

  test('number has correct type', () => {
    expect(NUMBER_PROPERTY.type).toBe('number');
  });

  test('string has correct type', () => {
    expect(STRING_PROPERTY.type).toBe('string');
  });

  // Shared implementation, only testing via boolean
  test('validator works for null/undefined', () => {
    expect(BOOLEAN_PROPERTY.validator(null, true, propertyTypeInstance)).toBeUndefined();

    expect(BOOLEAN_PROPERTY.validator(undefined, true, propertyTypeInstance)).toBeUndefined();

    expect(BOOLEAN_PROPERTY.validator(null, false, propertyTypeInstance)).toBe('Required property got null value');

    expect(BOOLEAN_PROPERTY.validator(undefined, false, propertyTypeInstance)).toBe(
      'Required property got undefined value'
    );
  });

  test('validator works for legitimate values', () => {
    expect(BOOLEAN_PROPERTY.validator(true, false, propertyTypeInstance)).toBeUndefined();
    expect(BOOLEAN_PROPERTY.validator(false, false, propertyTypeInstance)).toBeUndefined();

    expect(BOOLEAN_PROPERTY.validator(true, true, propertyTypeInstance)).toBeUndefined();
    expect(BOOLEAN_PROPERTY.validator(false, true, propertyTypeInstance)).toBeUndefined();
  });

  test('validator rejects bad values', () => {
    expect(BOOLEAN_PROPERTY.validator(5, true, propertyTypeInstance)).toBe(
      'Provided value is not a boolean, detected: number'
    );
    expect(BOOLEAN_PROPERTY.validator('true', true, propertyTypeInstance)).toBe(
      'Provided value is not a boolean, detected: string'
    );
    expect(BOOLEAN_PROPERTY.validator(Symbol('test'), true, propertyTypeInstance)).toBe(
      'Provided value is not a boolean, detected: symbol'
    );
    expect(BOOLEAN_PROPERTY.validator([], true, propertyTypeInstance)).toBe(
      'Provided value is not a boolean, detected: object'
    );
    expect(BOOLEAN_PROPERTY.validator({}, true, propertyTypeInstance)).toBe(
      'Provided value is not a boolean, detected: object'
    );
  });
});

describe('Predefined Model Property plain object type', () => {
  const propertyTypeInstance = { key: 'any' }; // Not used by predefined validators
  test('validator works for null/undefined', () => {
    expect(PLAIN_OBJECT_PROPERTY.validator(null, true, propertyTypeInstance)).toBeUndefined();

    expect(PLAIN_OBJECT_PROPERTY.validator(undefined, true, propertyTypeInstance)).toBeUndefined();

    expect(PLAIN_OBJECT_PROPERTY.validator(null, false, propertyTypeInstance)).toBe('Required property got null value');

    expect(PLAIN_OBJECT_PROPERTY.validator(undefined, false, propertyTypeInstance)).toBe(
      'Required property got undefined value'
    );
  });

  test('validator works for legitimate values', () => {
    const goodValue = { test: 5 };

    expect(PLAIN_OBJECT_PROPERTY.validator(goodValue, false, propertyTypeInstance)).toBeUndefined();
    expect(PLAIN_OBJECT_PROPERTY.validator(goodValue, false, propertyTypeInstance)).toBeUndefined();

    expect(PLAIN_OBJECT_PROPERTY.validator(goodValue, true, propertyTypeInstance)).toBeUndefined();
    expect(PLAIN_OBJECT_PROPERTY.validator(goodValue, true, propertyTypeInstance)).toBeUndefined();
  });

  test('validator rejects bad values', () => {
    expect(PLAIN_OBJECT_PROPERTY.validator(5, true, propertyTypeInstance)).toBe(
      'Provided value is not an object, detected: number'
    );
    expect(PLAIN_OBJECT_PROPERTY.validator('true', true, propertyTypeInstance)).toBe(
      'Provided value is not an object, detected: string'
    );
    expect(PLAIN_OBJECT_PROPERTY.validator(Symbol('test'), true, propertyTypeInstance)).toBe(
      'Provided value is not an object, detected: symbol'
    );
    expect(PLAIN_OBJECT_PROPERTY.validator([], true, propertyTypeInstance)).toBe(
      'Provided value is not a plain object, detected: Array'
    );
  });
});

describe('Predefined Model Property unknown type', () => {
  test('validator works for null/undefined', () => {
    expect(UNKNOWN_PROPERTY.validator(null, true)).toBeUndefined();

    expect(UNKNOWN_PROPERTY.validator(undefined, true)).toBeUndefined();

    expect(UNKNOWN_PROPERTY.validator(null, false)).toBe('Required property got null value');

    expect(UNKNOWN_PROPERTY.validator(undefined, false)).toBe('Required property got undefined value');
  });

  test('validator works for all other values', () => {
    expect(UNKNOWN_PROPERTY.validator(true, false)).toBeUndefined();
    expect(UNKNOWN_PROPERTY.validator(false, false)).toBeUndefined();
    expect(UNKNOWN_PROPERTY.validator('string', true)).toBeUndefined();
    expect(UNKNOWN_PROPERTY.validator(10, true)).toBeUndefined();
    expect(UNKNOWN_PROPERTY.validator([], true)).toBeUndefined();
    expect(UNKNOWN_PROPERTY.validator({}, true)).toBeUndefined();
  });
});
