import { mapValues } from 'lodash-es';
import { PrimitiveSerializer } from './primitive-serializer';

describe('Primitive serializer', () => {
  let serializer: PrimitiveSerializer;

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
    instance: new (class {})()
  };
  beforeEach(() => {
    serializer = new PrimitiveSerializer();
  });

  test('should support string, number, boolean, undefined, null', () => {
    expect(mapValues(valuesToTest, value => serializer.canSerialize(value))).toEqual({
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
    expect(mapValues(valuesToTest, value => serializer.serialize(value))).toEqual(valuesToTest);
  });
});
