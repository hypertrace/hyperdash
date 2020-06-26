import { mapValues } from 'lodash';
import { PrimitiveDeserializer } from './primitive-deserializer';

describe('Primitive deserializer', () => {
  let deserializer: PrimitiveDeserializer;

  const valuesToTest = {
    string: 'string',
    number: 15,
    boolean: true,
    date: new Date(),
    // tslint:disable-next-line:no-null-keyword
    null: null,
    undefined: undefined,
    object: { test: 'test' },
    array: ['test'],
    instance: new (class ExampleClass {})()
  };
  beforeEach(() => {
    deserializer = new PrimitiveDeserializer();
  });

  test('should support string, number, boolean, undefined, null', () => {
    expect(mapValues(valuesToTest, value => deserializer.canDeserialize(value))).toEqual({
      string: true,
      number: true,
      boolean: true,
      date: false,
      null: true,
      undefined: true,
      object: false,
      array: false,
      instance: false
    });
  });

  test('should return the value given', () => {
    expect(mapValues(valuesToTest, value => deserializer.deserialize(value))).toEqual(valuesToTest);
  });
});
