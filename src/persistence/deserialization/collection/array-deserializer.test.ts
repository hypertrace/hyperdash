// tslint:disable:completed-docs
import { mapValues } from 'lodash';
import { PropertyLocation } from '../../../model/property/property-location';
import { DeserializationManager } from '../deserialization-manager';
import { ArrayDeserializer } from './array-deserializer';

describe('Array deserializer', () => {
  let deserializer: ArrayDeserializer;
  let mockDeserializationManager: DeserializationManager;
  const testClass = class {
    public array!: unknown[];
  };
  let parent: typeof testClass.prototype;
  let location: PropertyLocation<unknown[]>;

  const valuesToTest = {
    string: 'string',
    number: 15,
    boolean: true,
    date: new Date(),
    // tslint:disable-next-line:no-null-keyword
    null: null,
    undefined: undefined,
    object: { test: 'test' },
    literalArray: ['test'],
    emptyArray: [],
    constructedArray: new Array(1),
    instance: new (class ExampleClass {})()
  };
  beforeEach(() => {
    mockDeserializationManager = {
      deserialize: jest.fn()
      // tslint:disable-next-line:no-any
    } as any;
    deserializer = new ArrayDeserializer(mockDeserializationManager);
    parent = new testClass();
    location = PropertyLocation.forModelProperty(parent, 'array');
  });

  test('should support arrays only', () => {
    expect(mapValues(valuesToTest, value => deserializer.canDeserialize(value))).toEqual({
      string: false,
      number: false,
      boolean: false,
      date: false,
      null: false,
      undefined: false,
      object: false,
      literalArray: true,
      emptyArray: true,
      constructedArray: true,
      instance: false
    });
  });

  test('should pass array values to the deserialization manager', () => {
    deserializer.deserialize(['test', 5, []], location);
    expect(mockDeserializationManager.deserialize).toHaveBeenCalledTimes(3);
    expect(mockDeserializationManager.deserialize).toHaveBeenNthCalledWith(1, 'test', expect.any(PropertyLocation));
    expect(mockDeserializationManager.deserialize).toHaveBeenNthCalledWith(2, 5, expect.any(PropertyLocation));
    expect(mockDeserializationManager.deserialize).toHaveBeenNthCalledWith(3, [], expect.any(PropertyLocation));
  });

  test('should pass model context for child deserialization', () => {
    deserializer.deserialize(['test'], location);
    expect(mockDeserializationManager.deserialize).toHaveBeenCalledWith(
      'test',
      expect.objectContaining({ parentModel: parent, propertyKey: 'array:0' })
    );
  });
});
