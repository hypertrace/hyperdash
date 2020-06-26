import { Logger } from '../../util/logging/logger';
import { DeserializationManager } from './deserialization-manager';
import { Deserializer } from './deserializer';

describe('Deserialization manager', () => {
  let manager: DeserializationManager;
  let mockLogger: Partial<Logger>;

  const createDeserializerMatchingNumber = <T extends number>(valueToMatch: T): Deserializer<T, T> => {
    const deserializer: Deserializer<T, T> = {
      canDeserialize: (value): value is T => value === valueToMatch,
      deserialize: value => value
    };
    spyOn(deserializer, 'deserialize');

    return deserializer;
  };

  beforeEach(() => {
    mockLogger = {};
    manager = new DeserializationManager(mockLogger as Logger);
  });

  test('allows registration of deserializers', () => {
    const deserializer = createDeserializerMatchingNumber(5);
    manager.registerDeserializer(deserializer);
    manager.deserialize(5);

    expect(deserializer.deserialize).toHaveBeenCalledTimes(1);
  });

  test('uses first matching deserializer', () => {
    const firstDeserializer = createDeserializerMatchingNumber(5);
    const secondDeserializer = createDeserializerMatchingNumber(6);
    const thirdDeserializer = createDeserializerMatchingNumber(6);

    manager.registerDeserializer(firstDeserializer);
    manager.registerDeserializer(secondDeserializer);
    manager.registerDeserializer(thirdDeserializer);
    manager.deserialize(6);

    expect(firstDeserializer.deserialize).not.toHaveBeenCalled();

    expect(secondDeserializer.deserialize).toHaveBeenCalledTimes(1);

    expect(thirdDeserializer.deserialize).not.toHaveBeenCalled();
  });

  test('throws error if no matching deserializer found', () => {
    mockLogger.error = jest.fn((message: string) => ({
      throw: jest.fn(() => {
        throw Error(message);
      })
    })) as jest.Mock;

    const deserializer = createDeserializerMatchingNumber(5);
    manager.registerDeserializer(deserializer);

    expect(() => manager.deserialize(6)).toThrow('No deserializer registered matching provided json value');
    expect(mockLogger.error).toHaveBeenCalledWith('No deserializer registered matching provided json value');
  });
});
