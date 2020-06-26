import { mapValues } from 'lodash';
import { PropertyLocation } from '../../../model/property/property-location';
import { VariableManager } from '../../../variable/manager/variable-manager';
import { VariableDeserializer } from './variable-deserializer';

describe('Variable deserializer', () => {
  let deserializer: VariableDeserializer;
  let mockVariableManager: Partial<VariableManager>;

  const valuesToTest = {
    string: 'string',
    variable: 'VARIABLE',
    number: 15,
    boolean: true,
    date: new Date(),
    // tslint:disable-next-line:no-null-keyword
    null: null,
    undefined: undefined,
    object: { test: 'VARIABLE' },
    array: ['VARIABLE'],
    instance: new (class ExampleClass {})()
  };
  beforeEach(() => {
    mockVariableManager = {
      isVariableExpression: jest.fn(value => value === 'VARIABLE'),
      registerReference: jest.fn()
    };
    deserializer = new VariableDeserializer(mockVariableManager as VariableManager);
  });

  test('should support only variable strings', () => {
    expect(mapValues(valuesToTest, value => deserializer.canDeserialize(value))).toEqual({
      string: false,
      variable: true,
      number: false,
      boolean: false,
      date: false,
      null: false,
      undefined: false,
      object: false,
      array: false,
      instance: false
    });
  });

  test('should register the value and location given', () => {
    const fakeLocation = {};
    deserializer.deserialize('VARIABLE', fakeLocation as PropertyLocation);
    expect(mockVariableManager.registerReference).toHaveBeenCalledWith(fakeLocation, 'VARIABLE');
  });
});
