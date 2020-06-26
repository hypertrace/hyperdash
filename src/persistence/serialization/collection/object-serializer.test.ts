// tslint:disable:completed-docs
import { mapValues } from 'lodash';
import { PropertyLocation } from '../../../model/property/property-location';
import { PartialObjectMock } from '../../../test/partial-object-mock';
import { SerializationManager } from '../serialization-manager';
import { ObjectSerializer } from './object-serializer';

describe('Object serializer', () => {
  let serializer: ObjectSerializer;
  let mockSerializationManager: PartialObjectMock<SerializationManager>;
  const parent = new (class {
    public obj!: object;
  })();
  let location: PropertyLocation<object>;

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
    array: [],
    instance: new (class {})()
  };
  beforeEach(() => {
    mockSerializationManager = {
      serialize: jest.fn()
    };
    serializer = new ObjectSerializer(mockSerializationManager as SerializationManager);
    location = PropertyLocation.forModelProperty(parent, 'obj');
  });

  test('should support plain objects only', () => {
    expect(mapValues(valuesToTest, value => serializer.canSerialize(value))).toEqual({
      string: false,
      symbol: false,
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

  test('should pass object values to the serialization manager', () => {
    serializer.serialize(
      {
        string: 'string',
        undefined: undefined,
        object: {},
        array: []
      },
      location
    );
    expect(mockSerializationManager.serialize).toHaveBeenCalledTimes(4);
    expect(mockSerializationManager.serialize).nthCalledWith(1, 'string', expect.any(PropertyLocation));
    expect(mockSerializationManager.serialize).nthCalledWith(2, undefined, expect.any(PropertyLocation));
    expect(mockSerializationManager.serialize).nthCalledWith(3, {}, expect.any(PropertyLocation));
    expect(mockSerializationManager.serialize).nthCalledWith(4, [], expect.any(PropertyLocation));
  });

  test('should pass location context for child serialization', () => {
    serializer.serialize(
      {
        stringKey: 'stringValue'
      },
      location
    );
    expect(mockSerializationManager.serialize).toHaveBeenCalledWith(
      'stringValue',
      expect.objectContaining({ parentModel: parent, propertyKey: 'obj:stringKey' })
    );
  });
});
