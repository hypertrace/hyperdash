// tslint:disable:completed-docs
import { Logger } from '../../util/logging/logger';
import { BOOLEAN_PROPERTY, STRING_PROPERTY } from '../property/predefined/primitive-model-property-types';
import { deferredModelDecoratorRegistrations } from './model-decorators';
import { ModelLibrary } from './model-registration';

describe('Model', () => {
  const testClass = class TestClass {};
  let library: ModelLibrary;
  let mockLogger: Partial<Logger>;

  beforeEach(() => {
    mockLogger = {};
    library = new ModelLibrary(mockLogger as Logger);
  });

  test('can be registered', () => {
    library.registerModelClass(testClass, { type: 'test-model', displayName: 'Test Model Display' });
    expect(library.lookupModelMetadata(testClass)).toEqual({
      type: 'test-model',
      displayName: 'Test Model Display',
      supportedDataSourceTypes: []
    });

    expect(library.lookupModelClass('test-model')).toBe(testClass);
  });

  test('defaults display name on registration', () => {
    library.registerModelClass(testClass, { type: 'test-model' });
    expect(library.lookupModelMetadata(testClass)).toEqual({
      type: 'test-model',
      displayName: 'Test Model',
      supportedDataSourceTypes: []
    });

    expect(library.lookupModelClass('test-model')).toBe(testClass);
  });

  test('types can not be re-registered', () => {
    mockLogger.error = jest.fn();
    library.registerModelClass(testClass, { type: 'test-model' });
    library.registerModelClass(class OtherClass {}, { type: 'test-model' });

    expect(mockLogger.error).toHaveBeenCalledWith('Model types may not be registered more than once: test-model');
    expect(library.lookupModelClass('test-model')).toBe(testClass);
  });

  test('classes can not be re-registered', () => {
    mockLogger.error = jest.fn();
    library.registerModelClass(testClass, { type: 'test-model' });
    library.registerModelClass(testClass, { type: 'other-test-model' });

    expect(library.lookupModelMetadata(testClass)).toEqual(expect.objectContaining({ type: 'test-model' }));
    expect(mockLogger.error).toHaveBeenCalledWith('Model classes may not be registered more than once: TestClass');
  });

  test('lookup fails for unregistered models', () => {
    mockLogger.info = jest.fn();

    expect(library.lookupModelMetadata(testClass)).toBeUndefined();
    expect(mockLogger.info).toHaveBeenLastCalledWith('No type registered matching class: TestClass');

    expect(library.lookupModelClass('test-model')).toBeUndefined();

    expect(mockLogger.info).toHaveBeenLastCalledWith('No class registered matching type: test-model');
  });

  test('can return compatible models', () => {
    const childClass1 = class extends testClass {};
    const childClass2 = class extends testClass {};
    const childOfChildClass1 = class extends childClass1 {};

    library.registerModelClass(testClass, { type: 'test-class' });
    library.registerModelClass(childClass1, { type: 'child-class-1' });
    library.registerModelClass(childClass2, { type: 'child-class-2' });
    library.registerModelClass(childOfChildClass1, { type: 'child-of-child-class-1' });

    expect(library.getAllCompatibleModelClasses(testClass)).toEqual(
      expect.arrayContaining([testClass, childClass1, childClass2, childOfChildClass1])
    );

    expect(library.getAllCompatibleModelClasses(childClass1)).toEqual(
      expect.arrayContaining([childClass1, childOfChildClass1])
    );

    expect(library.getAllCompatibleModelClasses(childClass2)).toEqual(expect.arrayContaining([childClass2]));

    expect(library.getAllCompatibleModelClasses(childOfChildClass1)).toEqual(
      expect.arrayContaining([childOfChildClass1])
    );
  });

  test('returns empty array if no compatible models', () => {
    expect(library.getAllCompatibleModelClasses(class {})).toEqual([]);
  });
});

describe('Model properties', () => {
  const symbolKey = Symbol('symbol key');
  const testClass = class TestClass {
    public readonly runtimeKey?: string;
    public readonly [symbolKey]: boolean = false;
  };
  let library: ModelLibrary;
  let mockLogger: Partial<Logger>;

  beforeEach(() => {
    mockLogger = {};
    library = new ModelLibrary(mockLogger as Logger);
  });

  test('can be registered and properly defaulted', () => {
    library.registerModelProperty(testClass, 'runtimeKey', {
      key: 'stringKey',
      type: STRING_PROPERTY.type,
      required: false,
      displayName: 'My fancy string'
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any https://github.com/microsoft/TypeScript/issues/38009
    library.registerModelProperty(testClass, symbolKey as any, {
      key: 'symbolKey',
      type: { key: BOOLEAN_PROPERTY.type }
    });

    expect(library.lookupModelProperties(testClass)).toEqual([
      {
        key: 'stringKey',
        type: { key: STRING_PROPERTY.type },
        required: false,
        displayName: 'My fancy string',
        runtimeKey: 'runtimeKey'
      },
      {
        key: 'symbolKey',
        type: { key: BOOLEAN_PROPERTY.type },
        required: false,
        displayName: 'Symbol Key',
        runtimeKey: symbolKey
      }
    ]);
  });

  test('metadata cannot be changed externally', () => {
    library.registerModelProperty(testClass, 'runtimeKey', { type: STRING_PROPERTY.type, key: 'runtimeKey' });
    const metadata = library.lookupModelProperties(testClass);
    metadata.forEach(val => (val.key = 'overwritten'));

    expect(library.lookupModelProperties(testClass)).toEqual([expect.objectContaining({ key: 'runtimeKey' })]);
  });

  test('properties can not be re-registered', () => {
    mockLogger.error = jest.fn();
    library.registerModelProperty(testClass, 'runtimeKey', { type: STRING_PROPERTY.type, key: 'runtimeKey' });
    library.registerModelProperty(testClass, 'runtimeKey', { type: BOOLEAN_PROPERTY.type, key: 'runtimeKey' });

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Model properties may not be registered more than once: TestClass.runtimeKey'
    );
    expect(library.lookupModelProperties(testClass)).toEqual([
      expect.objectContaining({ type: { key: STRING_PROPERTY.type } })
    ]);
  });

  test('lookup always succeeds for registered classes', () => {
    // A model class can be registered without properties - lookup should not fail
    library.registerModelClass(testClass, { type: 'test-model' });
    expect(library.lookupModelProperties(testClass)).toEqual([]);
  });

  test('lookup returns empty array for unregistered model classes', () => {
    mockLogger.info = jest.fn();

    expect(library.lookupModelProperties(class OtherClass {})).toEqual([]);
  });

  test('are inherited from super classes', () => {
    const childTestClass = class ChildTestClass extends testClass {
      public readonly childProp!: string;
    };
    const grandChildTestClass = class GrandChildTestClass extends childTestClass {
      public readonly grandChildProp!: string;
    };
    library.registerModelProperty(testClass, 'runtimeKey', { key: 'runtimeKey', type: STRING_PROPERTY.type });
    library.registerModelProperty(childTestClass, 'childProp', { key: 'childProp', type: STRING_PROPERTY.type });
    library.registerModelProperty(grandChildTestClass, 'grandChildProp', {
      key: 'grandChildProp',
      type: STRING_PROPERTY.type
    });

    expect(library.lookupModelProperties(testClass)).toEqual([expect.objectContaining({ key: 'runtimeKey' })]);
    expect(library.lookupModelProperties(childTestClass)).toEqual([
      expect.objectContaining({ key: 'runtimeKey' }),
      expect.objectContaining({ key: 'childProp' })
    ]);
    expect(library.lookupModelProperties(grandChildTestClass)).toEqual([
      expect.objectContaining({ key: 'runtimeKey' }),
      expect.objectContaining({ key: 'childProp' }),
      expect.objectContaining({ key: 'grandChildProp' })
    ]);
  });
});

describe('Model Library', () => {
  const testClass = class TestClass {
    public readonly key!: string;
  };
  let library: ModelLibrary;
  let mockLogger: Partial<Logger>;

  beforeEach(() => {
    mockLogger = {};
    library = new ModelLibrary(mockLogger as Logger);
  });

  test('supports decorator information added after construction', () => {
    deferredModelDecoratorRegistrations.length = 0;
    deferredModelDecoratorRegistrations.push(
      providedLib => providedLib.registerModelClass(testClass, { type: 'test-model' }),
      providedLib => providedLib.registerModelProperty(testClass, 'key', { key: 'key', type: STRING_PROPERTY.type })
    );

    expect(library.lookupModelMetadata(testClass)).toEqual(expect.objectContaining({ type: 'test-model' }));

    expect(library.lookupModelClass('test-model')).toBe(testClass);

    expect(library.lookupModelProperties(testClass)).toEqual([expect.objectContaining({ key: 'key' })]);
  });

  test('supports deferred registrations added before construction', () => {
    deferredModelDecoratorRegistrations.length = 0;
    deferredModelDecoratorRegistrations.push(
      providedLib => providedLib.registerModelClass(testClass, { type: 'test-model' }),
      providedLib => providedLib.registerModelProperty(testClass, 'key', { key: 'key', type: STRING_PROPERTY.type })
    );
    library = new ModelLibrary(mockLogger as Logger);

    expect(library.lookupModelMetadata(testClass)).toEqual(expect.objectContaining({ type: 'test-model' }));

    expect(library.lookupModelClass('test-model')).toBe(testClass);

    expect(library.lookupModelProperties(testClass)).toEqual([expect.objectContaining({ key: 'key' })]);
  });
});
