import { getReflectedPropertyType } from './reflection-utilities';

const testDecorator = (_proto: unknown, _propertyKey: string) => {
  /*NOOP*/
};

interface TestInterface {
  property: string;
}

class DecoratedClass {
  public undecorated?: string;

  @testDecorator
  public decoratedPrimitive?: number;

  @testDecorator
  public decoratedComplex?: DecoratedClass;

  @testDecorator
  public decoratedUnion?: string | number;

  @testDecorator
  public decoratedIntersection?: string & number;

  @testDecorator
  public decoratedInterface?: TestInterface;
}

describe('Reflection utilities', () => {
  test('can detect property type from a decorated primitive property', () => {
    expect(getReflectedPropertyType(DecoratedClass, 'decoratedPrimitive')).toBe(Number);
  });

  test('can detect property type from a decorated complex property', () => {
    expect(getReflectedPropertyType(DecoratedClass, 'decoratedComplex')).toBe(DecoratedClass);
  });

  test('returns undefined for an undecorated property type', () => {
    expect(getReflectedPropertyType(DecoratedClass, 'undecorated')).toBeUndefined();
  });

  test('returns Object for a union property type', () => {
    expect(getReflectedPropertyType(DecoratedClass, 'decoratedUnion')).toBe(Object);
  });

  test('returns Object for a intersection property type', () => {
    expect(getReflectedPropertyType(DecoratedClass, 'decoratedIntersection')).toBe(Object);
  });

  test('returns Object for a interface type', () => {
    expect(getReflectedPropertyType(DecoratedClass, 'decoratedInterface')).toBe(Object);
  });
});
