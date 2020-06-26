import { PartialObjectMock } from '../../test/partial-object-mock';
import { Logger } from '../../util/logging/logger';
import { SerializationManager } from './serialization-manager';
import { Serializer } from './serializer';

describe('Serialization manager', () => {
  let manager: SerializationManager;
  let mockLogger: PartialObjectMock<Logger>;

  const createSerializerMatchingNumber = <T extends number>(valueToMatch: T): Serializer<number, T> => {
    const serializer: Serializer<number, T> = {
      canSerialize: (value): value is T => value === valueToMatch,
      serialize: jest.fn((val: unknown) => val) as jest.Mock
    };

    return serializer;
  };

  beforeEach(() => {
    mockLogger = {};
    manager = new SerializationManager(mockLogger as Logger);
  });

  test('allows registration of serializers', () => {
    const serializer = createSerializerMatchingNumber(5);
    manager.registerSerializer(serializer);
    manager.serialize(5);

    expect(serializer.serialize).toHaveBeenCalledTimes(1);
  });

  test('uses first matching serializer', () => {
    const firstSerializer = createSerializerMatchingNumber(5);
    const secondSerializer = createSerializerMatchingNumber(6);
    const thirdSerializer = createSerializerMatchingNumber(6);

    manager.registerSerializer(firstSerializer);
    manager.registerSerializer(secondSerializer);
    manager.registerSerializer(thirdSerializer);
    manager.serialize(6);

    expect(firstSerializer.serialize).not.toHaveBeenCalled();

    expect(secondSerializer.serialize).toHaveBeenCalledTimes(1);

    expect(thirdSerializer.serialize).not.toHaveBeenCalled();
  });

  test('throws error if no matching serializer found', () => {
    mockLogger.error = jest.fn((message: string) => ({
      throw: jest.fn(() => {
        throw Error(message);
      })
    }));

    const serializer = createSerializerMatchingNumber(5);
    manager.registerSerializer(serializer);

    expect(() => manager.serialize(6)).toThrow('No serializer registered matching provided value');
    expect(mockLogger.error).toHaveBeenCalledWith('No serializer registered matching provided value');
  });
});
