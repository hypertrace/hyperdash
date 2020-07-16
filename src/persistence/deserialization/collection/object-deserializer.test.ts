// tslint:disable:completed-docs
import { mapValues } from 'lodash-es';
import { PropertyLocation } from '../../../model/property/property-location';
import { DeserializationManager } from '../deserialization-manager';
import { ObjectDeserializer } from './object-deserializer';

describe('Object deserializer', () => {
  let deserializer: ObjectDeserializer;
  let mockDeserializationManager: DeserializationManager;
  const testClass = class {
    public obj!: object;
  };
  let parent: typeof testClass.prototype;
  let location: PropertyLocation<object>;

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
    instance: new (class ExampleClass {})()
  };
  beforeEach(() => {
    mockDeserializationManager = {
      deserialize: jest.fn()
      // tslint:disable-next-line:no-any
    } as any;
    deserializer = new ObjectDeserializer(mockDeserializationManager);
    parent = new testClass();
    location = PropertyLocation.forModelProperty(parent, 'obj');
  });

  test('should support objects only', () => {
    expect(mapValues(valuesToTest, value => deserializer.canDeserialize(value))).toEqual({
      string: false,
      number: false,
      boolean: false,
      date: false,
      null: false,
      undefined: false,
      object: true,
      array: false,
      instance: false
    });
  });

  test('should pass object values to the deserialization manager', () => {
    deserializer.deserialize(
      {
        string: 'string',
        undefined: undefined,
        object: {},
        array: []
      },
      location
    );
    expect(mockDeserializationManager.deserialize).toHaveBeenCalledTimes(4);
    expect(mockDeserializationManager.deserialize).toHaveBeenNthCalledWith(1, 'string', expect.any(PropertyLocation));
    expect(mockDeserializationManager.deserialize).toHaveBeenNthCalledWith(2, undefined, expect.any(PropertyLocation));
    expect(mockDeserializationManager.deserialize).toHaveBeenNthCalledWith(3, {}, expect.any(PropertyLocation));
    expect(mockDeserializationManager.deserialize).toHaveBeenNthCalledWith(4, [], expect.any(PropertyLocation));
  });

  test('should pass location context for child deserialization', () => {
    deserializer.deserialize(
      {
        stringKey: 'stringValue'
      },
      location
    );
    expect(mockDeserializationManager.deserialize).toHaveBeenCalledWith(
      'stringValue',
      expect.objectContaining({ parentModel: parent, propertyKey: 'obj:stringKey' })
    );
  });
});
