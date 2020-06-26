// tslint:disable:completed-docs
import { PartialObjectMock } from '../../test/partial-object-mock';
import { Logger } from '../../util/logging/logger';
import { ModelApiBuilder } from '../api/builder/model-api-builder';
import { ModelApi } from '../api/model-api';
import { ModelCreatedEvent } from '../events/model-created-event';
import { ModelDestroyedEvent } from '../events/model-destroyed-event';
import { ModelOnDestroy, ModelOnInit } from './model-lifecycle-hooks';
import { ModelManager } from './model-manager';

describe('Model manager', () => {
  const testClass = class TestClass {};
  let manager: ModelManager;
  let mockLogger: PartialObjectMock<Logger>;
  let mockApiBuilder: PartialObjectMock<ModelApiBuilder<ModelApi>>;

  let mockCreatedEvent: PartialObjectMock<ModelCreatedEvent>;
  let mockDestroyedEvent: PartialObjectMock<ModelDestroyedEvent>;

  beforeEach(() => {
    mockCreatedEvent = {
      publish: jest.fn()
    };

    mockDestroyedEvent = {
      publish: jest.fn()
    };

    mockLogger = {
      warn: jest.fn((message: string) => ({
        throw: jest.fn(() => {
          throw Error(message);
        })
      }))
    };

    mockApiBuilder = {
      matches: () => true,
      // tslint:disable-next-line: no-object-literal-type-assertion
      build: () => ({} as ModelApi)
    };

    manager = new ModelManager(
      mockLogger as Logger,
      mockCreatedEvent as ModelCreatedEvent,
      mockDestroyedEvent as ModelDestroyedEvent
    );

    manager.registerModelApiBuilder(mockApiBuilder as ModelApiBuilder<ModelApi>);
  });

  test('allows constructing new models', () => {
    const instance = manager.construct(testClass);
    expect(instance.constructor).toBe(testClass);
  });

  test('allows constructing a model with a parent', () => {
    const parent = manager.construct(testClass);
    const child = manager.construct(testClass, parent);
    expect(manager.getChildren(parent)).toEqual([child]);
    expect(manager.getParent(child)).toEqual(parent);
  });

  test('throws error constructing if provided parent is not tracked', () => {
    expect(() => manager.construct(testClass, new testClass())).toThrow(
      'Could not retrieve data for provided instance, it has not been registered'
    );
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Could not retrieve data for provided instance, it has not been registered'
    );
  });

  test('get children returns empty array if no children', () => {
    const instance = manager.construct(testClass);
    expect(manager.getChildren(instance)).toEqual([]);
  });

  test('throws error retrieving children if not tracked', () => {
    expect(() => manager.getChildren(new testClass())).toThrow(
      'Could not retrieve data for provided instance, it has not been registered'
    );

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Could not retrieve data for provided instance, it has not been registered'
    );
  });

  test('returns undefined for an instance with no parent', () => {
    const root = manager.construct(testClass);
    expect(manager.getParent(root)).toBeUndefined();
  });

  test('protects data from mutation', () => {
    const parent = manager.construct(testClass);
    const child = manager.construct(testClass, parent);
    manager.getChildren(parent).push(new testClass());
    expect(manager.getChildren(parent)).toEqual([child]);
  });

  test('throws error retrieving parent if not tracked', () => {
    expect(() => manager.getParent(new testClass())).toThrow(
      'Could not retrieve data for provided instance, it has not been registered'
    );

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Could not retrieve data for provided instance, it has not been registered'
    );
  });

  test('allows destroying models', () => {
    const instance = manager.construct(testClass);
    manager.destroy(instance);
    expect(() => manager.getChildren(instance)).toThrow(
      'Could not retrieve data for provided instance, it has not been registered'
    );

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Could not retrieve data for provided instance, it has not been registered'
    );
  });

  test('destroy succeeds if not registered or primitive', () => {
    expect(() => manager.destroy(new testClass())).not.toThrow();

    expect(() => manager.destroy(15)).not.toThrow();
  });

  test('destroy finds nested models', () => {
    const parent = manager.construct(testClass);

    const instance1 = manager.construct(testClass, parent);
    const arrayWithInstance1 = [instance1];
    const instance2 = manager.construct(testClass, parent);
    const objectWithInstance2 = { key: instance2 };
    const instance3 = manager.construct(testClass, parent);
    const nestedArrayWithInstance3 = { key: [instance3] };
    const instance4 = manager.construct(testClass, parent);
    const nestedObjectWithInstance4 = [{ key: instance4 }];

    expect(manager.getChildren(parent).length).toBe(4);

    manager.destroy(arrayWithInstance1);
    expect(manager.getChildren(parent).length).toBe(3);
    expect(manager.getChildren(parent)).toEqual(expect.arrayContaining([instance2, instance3, instance4]));

    manager.destroy(objectWithInstance2);
    expect(manager.getChildren(parent).length).toBe(2);
    expect(manager.getChildren(parent)).toEqual(expect.arrayContaining([instance3, instance4]));

    manager.destroy(nestedArrayWithInstance3);
    expect(manager.getChildren(parent).length).toBe(1);
    expect(manager.getChildren(parent)).toEqual(expect.arrayContaining([instance4]));

    manager.destroy(nestedObjectWithInstance4);
    expect(manager.getChildren(parent).length).toBe(0);
  });

  test('recursively destroys children', () => {
    const root = manager.construct(testClass);
    const firstChild = manager.construct(testClass, root);
    const secondChild = manager.construct(testClass, root);
    const firstChildOfFirstChild = manager.construct(testClass, firstChild);
    manager.destroy(root);

    expect(() => manager.getChildren(root)).toThrow();
    expect(() => manager.getChildren(firstChild)).toThrow();
    expect(() => manager.getChildren(secondChild)).toThrow();
    expect(() => manager.getChildren(firstChildOfFirstChild)).toThrow();
  });

  test('cleans up parent data after deleting child', () => {
    const root = manager.construct(testClass);
    const firstChild = manager.construct(testClass, root);
    const secondChild = manager.construct(testClass, root);

    manager.destroy(firstChild);

    expect(manager.getChildren(root)).toEqual([secondChild]);
  });

  test('fires init lifecycle hook', () => {
    const initSpy = jest.fn();
    const initModelClass = class ModelClass implements ModelOnInit {
      public modelOnInit: () => void = initSpy;
    };

    const model = manager.construct(initModelClass);

    expect(initSpy).not.toHaveBeenCalled(); // Doesn't init during construct

    manager.initialize(model);

    expect(initSpy).toHaveBeenCalledTimes(1);
  });

  test('safely skips initialize if no init hook', () => {
    expect(manager.initialize(new testClass())).toEqual(expect.any(testClass));
  });

  test('fires destroy lifecycle hook', () => {
    const destroyModelClass = class ModelClass implements ModelOnDestroy {
      public modelOnDestroy(): void {
        throw Error('Method not implemented.');
      }
    };

    const destroySpy = spyOn(destroyModelClass.prototype, 'modelOnDestroy');

    const destroyModelInstance = manager.construct(destroyModelClass);
    expect(destroySpy).not.toHaveBeenCalled();

    manager.destroy(destroyModelInstance);
    expect(destroySpy).toHaveBeenCalledTimes(1);
  });

  test('create calls construct then init', () => {
    const mockConstructResult = {};
    manager.construct = jest.fn().mockReturnValue(mockConstructResult);
    manager.initialize = jest.fn();

    manager.create(testClass);

    expect(manager.construct).toHaveBeenCalled();

    expect(manager.initialize).toHaveBeenCalledWith(mockConstructResult);
  });

  test('fires lifecycle events', () => {
    const root = manager.construct(testClass);
    const firstChild = manager.construct(testClass, root);

    expect(mockCreatedEvent.publish).toHaveBeenCalledTimes(2);
    expect(mockCreatedEvent.publish).toHaveBeenNthCalledWith(1, root);
    expect(mockCreatedEvent.publish).toHaveBeenNthCalledWith(2, firstChild);

    manager.destroy(root);

    expect(mockDestroyedEvent.publish).toHaveBeenCalledTimes(2);
    expect(mockDestroyedEvent.publish).toHaveBeenNthCalledWith(1, firstChild);
    expect(mockDestroyedEvent.publish).toHaveBeenNthCalledWith(2, root);
  });

  test('can find root model', () => {
    const root = manager.construct(testClass);
    const firstChild = manager.construct(testClass, root);
    const secondChild = manager.construct(testClass, root);
    const firstChildOfFirstChild = manager.construct(testClass, firstChild);

    expect(manager.getRoot(firstChild)).toBe(root);
    expect(manager.getRoot(secondChild)).toBe(root);
    expect(manager.getRoot(firstChildOfFirstChild)).toBe(root);
    expect(manager.getRoot(root)).toBe(root);
  });

  test('logs and throws error if attempting to find root of untracked model', () => {
    expect(() => manager.getRoot({})).toThrow(
      'Could not retrieve data for provided instance, it has not been registered'
    );
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  test('can determine if ancestor', () => {
    const root = manager.construct(testClass);
    const firstChild = manager.construct(testClass, root);
    const secondChild = manager.construct(testClass, root);
    const firstChildOfFirstChild = manager.construct(testClass, firstChild);

    expect(manager.isAncestor(firstChild, root)).toBe(true);
    expect(manager.isAncestor(secondChild, root)).toBe(true);
    expect(manager.isAncestor(firstChildOfFirstChild, root)).toBe(true);
    expect(manager.isAncestor(firstChildOfFirstChild, firstChild)).toBe(true);
    expect(manager.isAncestor(firstChildOfFirstChild, secondChild)).toBe(false);
    expect(manager.isAncestor(firstChild, secondChild)).toBe(false);
    expect(manager.isAncestor(secondChild, firstChild)).toBe(false);

    // Not ancestor of self
    expect(manager.isAncestor(firstChild, firstChild)).toBe(false);
    // Should handle if potential ancestor is not registered
    expect(manager.isAncestor(firstChild, {})).toBe(false);
  });

  test('logs and throws error if attempting to find ancestor of untracked node', () => {
    const root = manager.construct(testClass);

    expect(() => manager.isAncestor({}, root)).toThrow(
      'Could not retrieve data for provided instance, it has not been registered'
    );
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  test('delegates to correct model api builder', () => {
    manager = new ModelManager(
      mockLogger as Logger,
      mockCreatedEvent as ModelCreatedEvent,
      mockDestroyedEvent as ModelDestroyedEvent
    ); // Rebuild so we don't use the mock api build from other tests

    const modelAClass = class {};
    const modelBClass = class {};

    const builderForA = {
      matches: (model: object) => model instanceof modelAClass,
      build: jest.fn()
    };

    const builderForB = {
      matches: (model: object) => model instanceof modelBClass,
      build: jest.fn()
    };

    mockLogger.error = jest.fn((error: string) => ({
      throw: () => {
        throw Error(error);
      }
    }));

    manager.registerModelApiBuilder(builderForA);
    manager.registerModelApiBuilder(builderForB);

    manager.construct(modelAClass);
    expect(builderForA.build).toHaveBeenCalledTimes(1);

    manager.construct(modelBClass);
    expect(builderForB.build).toHaveBeenCalledTimes(1);

    expect(() => manager.construct(class {})).toThrow();
    expect(mockLogger.error).toHaveBeenCalledWith('No model API builder registered matching provided model');
  });

  test('invokes any registered decorators on model creation', () => {
    const decorator = {
      decorate: jest.fn()
    };

    manager.registerDecorator(decorator);
    const instance = manager.construct(testClass);
    expect(decorator.decorate).toHaveBeenCalledWith(instance, mockApiBuilder.build!(instance));
  });

  test('determines if a provided value is tracked or not', () => {
    const instance = manager.construct(testClass);
    expect(manager.isTrackedModel(instance)).toBe(true);

    expect(manager.isTrackedModel(undefined)).toBe(false);
    // tslint:disable-next-line:no-null-keyword
    expect(manager.isTrackedModel(null)).toBe(false);
    expect(manager.isTrackedModel([])).toBe(false);
    expect(manager.isTrackedModel(new testClass())).toBe(false);
    expect(manager.isTrackedModel({})).toBe(false);
    expect(manager.isTrackedModel('string')).toBe(false);
  });
});
