// tslint:disable: no-null-keyword
import { DeserializationManager } from '../../../persistence/deserialization/deserialization-manager';
import { PartialObjectMock } from '../../../test/partial-object-mock';
import { ModelManager } from '../../manager/model-manager';
import { PropertyLocation } from '../property-location';
import { ModelPropertyType } from './model-property-type';

describe('Model property type validator', () => {
  let mockDeserializationManager: PartialObjectMock<DeserializationManager>;
  let mockModelManager: PartialObjectMock<ModelManager>;
  let propertyType: ModelPropertyType;
  const model = { prop: {} };
  const propertyLocation = PropertyLocation.forModelProperty(model, 'prop');

  beforeEach(() => {
    mockDeserializationManager = {
      deserialize: jest.fn()
    };
    mockModelManager = {
      create: jest.fn()
    };

    propertyType = new ModelPropertyType(
      mockDeserializationManager as DeserializationManager,
      mockModelManager as ModelManager
    );
  });
  test('validator works for null/undefined', () => {
    expect(propertyType.validator(null, true)).toBeUndefined();

    expect(propertyType.validator(undefined, true)).toBeUndefined();

    expect(propertyType.validator(null, false)).toBe('Required property got null value');

    expect(propertyType.validator(undefined, false)).toBe('Required property got undefined value');
  });

  test('validator works for legitimate values', () => {
    const goodValue = {
      type: 'test'
    };
    expect(propertyType.validator(goodValue, false)).toBeUndefined();
    expect(propertyType.validator(goodValue, false)).toBeUndefined();

    expect(propertyType.validator(goodValue, true)).toBeUndefined();
    expect(propertyType.validator(goodValue, true)).toBeUndefined();
  });

  test('validator rejects bad values', () => {
    expect(propertyType.validator(5, true)).toBe('Provided value is not model JSON, detected type: number');
    expect(propertyType.validator('true', true)).toBe('Provided value is not model JSON, detected type: string');
    expect(propertyType.validator(Symbol('test'), true)).toBe(
      'Provided value is not model JSON, detected type: symbol'
    );
    expect(propertyType.validator([], true)).toBe('Provided value is missing model JSON required type field');
    expect(propertyType.validator({}, true)).toBe('Provided value is missing model JSON required type field');
  });

  test('deserializes as normal if no default or value provided', () => {
    const value = {
      type: 'test'
    };
    // Value provided
    propertyType.deserializer(value, propertyLocation, { key: ModelPropertyType.TYPE, defaultModelClass: class {} });
    expect(mockDeserializationManager.deserialize).toHaveBeenCalledWith(value, propertyLocation);
    expect(mockModelManager.create).not.toHaveBeenCalled();

    // No default
    propertyType.deserializer(undefined, propertyLocation, { key: ModelPropertyType.TYPE });
    expect(mockDeserializationManager.deserialize).toHaveBeenLastCalledWith(undefined, propertyLocation);
    expect(mockModelManager.create).not.toHaveBeenCalled();
  });

  test('defaults to instance of requested class if undefined', () => {
    const defaultClass = class {};
    // Value provided
    propertyType.deserializer(undefined, propertyLocation, {
      key: ModelPropertyType.TYPE,
      defaultModelClass: defaultClass
    });
    expect(mockDeserializationManager.deserialize).not.toHaveBeenCalled();
    expect(mockModelManager.create).toHaveBeenCalledWith(defaultClass, model);
  });
});
