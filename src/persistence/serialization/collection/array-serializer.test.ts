import { mapValues } from 'lodash';
import { PropertyLocation } from '../../../model/property/property-location';
import { PartialObjectMock } from '../../../test/partial-object-mock';
import { SerializationManager } from '../serialization-manager';
import { ArraySerializer } from './array-serializer';

describe('Array serializer', () => {
  let serializer: ArraySerializer;
  let mockSerializationManager: PartialObjectMock<SerializationManager>;
  const parent = new (class {
    public array!: unknown[];
  })();
  let location: PropertyLocation<unknown[]>;

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
    literalArray: ['test'],
    emptyArray: [],
    constructedArray: new Array(1),
    instance: new (class ExampleClass {})()
  };

  beforeEach(() => {
    mockSerializationManager = {
      serialize: jest.fn()
    };
    serializer = new ArraySerializer(mockSerializationManager as SerializationManager);
    location = PropertyLocation.forModelProperty(parent, 'array');
  });

  test('should support arrays only', () => {
    expect(mapValues(valuesToTest, value => serializer.canSerialize(value))).toEqual({
      string: false,
      symbol: false,
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

  test('should pass array values to the serialization manager', () => {
    serializer.serialize(['test', 5, []], location);
    expect(mockSerializationManager.serialize).toHaveBeenCalledTimes(3);
    expect(mockSerializationManager.serialize).nthCalledWith(1, 'test', expect.any(PropertyLocation));
    expect(mockSerializationManager.serialize).nthCalledWith(2, 5, expect.any(PropertyLocation));
    expect(mockSerializationManager.serialize).nthCalledWith(3, [], expect.any(PropertyLocation));
  });

  test('should pass model context for child serialization', () => {
    serializer.serialize(['test'], location);
    expect(mockSerializationManager.serialize).toHaveBeenCalledWith(
      'test',
      expect.objectContaining({ parentModel: parent, propertyKey: 'array:0' })
    );
  });
});
