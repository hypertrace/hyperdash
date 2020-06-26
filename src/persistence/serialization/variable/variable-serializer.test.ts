import { mapValues } from 'lodash';
import { PropertyLocation } from '../../../model/property/property-location';
import { PartialObjectMock } from '../../../test/partial-object-mock';
import { VariableManager } from '../../../variable/manager/variable-manager';
import { VariableSerializer } from './variable-serializer';

describe('Variable serializer', () => {
  let serializer: VariableSerializer;
  let mockVariableManager: PartialObjectMock<VariableManager>;

  const valuesToTest = {
    string: 'string',
    unrealizedVariable: 'VARIABLE',
    symbol: Symbol('symbol'),
    number: 15,
    boolean: true,
    date: new Date(),
    // tslint:disable-next-line:no-null-keyword
    null: null,
    undefined: undefined,
    object: { test: 'VARIABLE' },
    array: ['VARIABLE'],
    instance: new (class {})(),
    objectFromVariable: new (class {})(),
    stringFromVariable: 'magic variable string',
    numberFromVariable: 42
  };
  beforeEach(() => {
    mockVariableManager = {
      isVariableReference: jest.fn((location: PropertyLocation) => location.toString().endsWith('FromVariable')),
      getVariableExpressionFromLocation: jest.fn()
    };
    serializer = new VariableSerializer(mockVariableManager as VariableManager);
  });

  test('should support only variable references', () => {
    const propLocationForKey = (key: string) =>
      PropertyLocation.forModelProperty<{ [key: string]: unknown }, string>(valuesToTest, key);

    const mappedValues = mapValues(valuesToTest, (value, key) =>
      serializer.canSerialize(value, propLocationForKey(key))
    );

    expect(mappedValues).toEqual({
      string: false,
      unrealizedVariable: false,
      symbol: false,
      number: false,
      boolean: false,
      date: false,
      null: false,
      undefined: false,
      object: false,
      array: false,
      instance: false,
      objectFromVariable: true,
      stringFromVariable: true,
      numberFromVariable: true
    });
  });

  test('should not accept serialization without a location', () => {
    expect(serializer.canSerialize('value')).toBe(false);
  });

  test('should retrieve the variable expression from given location', () => {
    const fakeLocation = {};
    serializer.serialize(undefined, fakeLocation as PropertyLocation);
    expect(mockVariableManager.getVariableExpressionFromLocation).toHaveBeenCalledWith(fakeLocation);
  });
});
