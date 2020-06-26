// tslint:disable: no-null-keyword
import { ARRAY_PROPERTY } from './array-property-type';

describe('Predefined Model Property array type', () => {
  test('validator works for null/undefined', () => {
    expect(ARRAY_PROPERTY.validator(null, true)).toBeUndefined();

    expect(ARRAY_PROPERTY.validator(undefined, true)).toBeUndefined();

    expect(ARRAY_PROPERTY.validator(null, false)).toBe('Required property got null value');

    expect(ARRAY_PROPERTY.validator(undefined, false)).toBe('Required property got undefined value');
  });

  test('validator works for legitimate values', () => {
    const goodValue = ['test'];

    expect(ARRAY_PROPERTY.validator(goodValue, false)).toBeUndefined();
    expect(ARRAY_PROPERTY.validator(goodValue, false)).toBeUndefined();

    expect(ARRAY_PROPERTY.validator(goodValue, true)).toBeUndefined();
    expect(ARRAY_PROPERTY.validator(goodValue, true)).toBeUndefined();
  });

  test('validator rejects bad values', () => {
    expect(ARRAY_PROPERTY.validator(5, true)).toBe('Provided value is not an Array, detected: number');
    expect(ARRAY_PROPERTY.validator('true', true)).toBe('Provided value is not an Array, detected: string');
    expect(ARRAY_PROPERTY.validator(Symbol('test'), true)).toBe('Provided value is not an Array, detected: symbol');
    expect(ARRAY_PROPERTY.validator({ [1]: 'value', length: 1 }, true)).toBe(
      'Provided value is not an Array, detected: object'
    );
  });
});
