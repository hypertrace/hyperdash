// tslint:disable:no-invalid-template-strings
import { ModelChangedEvent } from '../../model/events/model-changed-event';
import { ModelManager } from '../../model/manager/model-manager';
import { PropertyLocation } from '../../model/property/property-location';
import { PartialObjectMock } from '../../test/partial-object-mock';
import { Logger } from '../../util/logging/logger';
import { VariableManager } from './variable-manager';

describe('Variable manager', () => {
  let manager: VariableManager;
  let mockLogger: Partial<Logger>;
  let mockModelManager: Partial<ModelManager>;
  let mockModelChangedEvent: Partial<ModelChangedEvent>;
  const model = {};
  const parent = {};
  const root = {};

  beforeEach(() => {
    mockLogger = {
      warn: jest.fn()
    };
    mockModelChangedEvent = {
      publishChange: jest.fn()
    };
    mockModelManager = {
      getParent: jest.fn().mockImplementation(inputModel => {
        if (inputModel === model) {
          return parent;
        }
        if (inputModel === parent) {
          return root;
        }

        return undefined;
      })
    };

    manager = new VariableManager(
      mockLogger as Logger,
      mockModelManager as ModelManager,
      mockModelChangedEvent as ModelChangedEvent
    );
  });

  test('should support basic read/write', () => {
    manager.set('a', 'a value', model);
    manager.set('b', 'b value', model);
    manager.set('c', 'c value', model);

    expect(manager.get('a', model)).toBe('a value');
    expect(manager.get('b', model)).toBe('b value');
    expect(manager.get('c', model)).toBe('c value');
  });

  test('should return undefined and warn for an unknown key', () => {
    expect(manager.get('a', model)).toBe(undefined);
    expect(mockLogger.warn).toHaveBeenCalledWith('Attempting to lookup unassigned variable: a');
  });

  test('should allow overwrite of existing variable', () => {
    manager.set('a', 'a value', model);
    manager.set('a', 'new a value', model);

    expect(manager.get('a', model)).toBe('new a value');
  });

  test('should resolve to higher scopes', () => {
    manager.set('a', 'a value', model);
    manager.set('b', 'b value', parent);
    manager.set('c', 'c value', root);

    expect(manager.get('a', model)).toBe('a value');
    expect(manager.get('b', model)).toBe('b value');
    expect(manager.get('c', model)).toBe('c value');
  });

  test('should support variable shadowing', () => {
    manager.set('a', 'a value', model);
    manager.set('a', "parent's a value", parent);

    expect(manager.get('a', model)).toBe('a value');
    expect(manager.get('a', parent)).toBe("parent's a value");
    expect(manager.get('a', root)).toBeUndefined();
  });

  test('should determine if a key is contained in the provided model scope', () => {
    manager.set('a', 'a value', root);
    manager.set('b', "parent's b value", parent);
    expect(manager.has('a', root)).toBe(true);
    expect(manager.has('a', model)).toBe(true);
    expect(manager.has('b', root)).toBe(false);
    expect(manager.has('b', parent)).toBe(true);
    expect(manager.has('b', model)).toBe(true);
    expect(manager.has('c', model)).toBe(false);
  });

  test('should treat an undefined variable the same as none at all', () => {
    manager.set('a', undefined, root);
    expect(manager.has('a', root)).toBe(false);
  });
});

describe('Variable manager reference tracking', () => {
  // Not mocking variable reference, we want to test a little more integration here
  let manager: VariableManager;
  let mockLogger: PartialObjectMock<Logger>;
  let mockModelManager: PartialObjectMock<ModelManager>;
  let mockModelChangedEvent: PartialObjectMock<ModelChangedEvent>;

  let mockParentLocation: PartialObjectMock<PropertyLocation>;
  const parent = {};

  let mockModelLocation: PartialObjectMock<PropertyLocation>;
  const model = {};

  beforeEach(() => {
    mockModelChangedEvent = { publishChange: jest.fn() };
    mockLogger = {
      error: jest.fn()
    };
    mockModelManager = {
      getParent: jest.fn().mockImplementation(inputModel => {
        if (inputModel === model) {
          return parent;
        }

        return undefined;
      }),
      getRoot: jest.fn().mockReturnValue(parent),
      isAncestor: jest.fn(
        (amodel: object, potentialAncestor: object) => amodel === model && potentialAncestor === parent
      )
    };

    mockModelLocation = {
      parentModel: model,
      setProperty: jest.fn(),
      toString: () => 'modelProp'
    };

    mockParentLocation = {
      parentModel: parent,
      setProperty: jest.fn(),
      toString: () => 'parentProp'
    };

    manager = new VariableManager(
      mockLogger as Logger,
      mockModelManager as ModelManager,
      mockModelChangedEvent as ModelChangedEvent
    );
  });

  test('should be able to register references', () => {
    manager.registerReference(mockModelLocation as PropertyLocation, '${test}');
    expect(manager.isVariableReference(mockModelLocation as PropertyLocation)).toBe(true);

    expect(manager.isVariableReference(mockParentLocation as PropertyLocation)).toBe(false);
    manager.registerReference(mockParentLocation as PropertyLocation, '${test}');
    expect(manager.isVariableReference(mockParentLocation as PropertyLocation)).toBe(true);
  });

  test('should log error if registering twice to the same location', () => {
    manager.registerReference(mockModelLocation as PropertyLocation, '${test}');
    manager.registerReference(mockModelLocation as PropertyLocation, '${test}');
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Attempting to register reference which has already been declared at modelProp'
    );
  });

  test('should update existing references when setting a variable', () => {
    manager.registerReference(mockModelLocation as PropertyLocation, '${test}');
    expect(mockModelChangedEvent.publishChange).nthCalledWith(1, model);
    manager.set('test', 'foo', model);
    expect(mockModelLocation.setProperty).toHaveBeenLastCalledWith('foo');
    expect(mockModelChangedEvent.publishChange).nthCalledWith(2, model);
    manager.set('test', 'baz', model);
    expect(mockModelLocation.setProperty).toHaveBeenLastCalledWith('baz');
    expect(mockModelChangedEvent.publishChange).nthCalledWith(3, model);
    expect(mockModelChangedEvent.publishChange).toHaveBeenCalledTimes(3);
  });

  test('should shadow existing variables when setting at a more specific scope', () => {
    manager.registerReference(mockModelLocation as PropertyLocation, '${test}');
    expect(mockModelLocation.setProperty).toHaveBeenNthCalledWith(1, undefined);

    manager.set('test', 'foo', parent);
    expect(mockModelLocation.setProperty).toHaveBeenNthCalledWith(2, 'foo');

    manager.set('test', 'baz', model);
    expect(mockModelLocation.setProperty).toHaveBeenNthCalledWith(3, 'baz');

    manager.set('test', 'more baz', model);
    expect(mockModelLocation.setProperty).toHaveBeenNthCalledWith(4, 'more baz');

    manager.set('test', 'bar', parent);
    // Not called again
    expect(mockModelLocation.setProperty).toHaveBeenCalledTimes(4);
  });

  test('should not shadow references for parent models', () => {
    manager.registerReference(mockModelLocation as PropertyLocation, '${test}');
    manager.registerReference(mockParentLocation as PropertyLocation, '${test}');

    manager.set('test', 'baz', model);
    expect(mockModelLocation.setProperty).toHaveBeenLastCalledWith('baz');
    expect(mockParentLocation.setProperty).toHaveBeenLastCalledWith(undefined);

    manager.set('test', 'foo', parent);
    expect(mockModelLocation.setProperty).toHaveBeenLastCalledWith('baz');
    expect(mockParentLocation.setProperty).toHaveBeenLastCalledWith('foo');
  });

  test('should track references in complex variables correctly', () => {
    manager.registerReference(mockModelLocation as PropertyLocation, '${${a}${b}}');
    expect(mockModelLocation.setProperty).toHaveBeenNthCalledWith(1, undefined);

    manager.set('foobar', 'baz', model);
    manager.set('b', 'bar', model);
    expect(mockModelLocation.setProperty).toHaveBeenNthCalledWith(2, undefined);
    manager.set('a', 'foo', model);
    expect(mockModelLocation.setProperty).toHaveBeenNthCalledWith(3, 'baz');

    manager.set('b', 'c', model);
    expect(mockModelLocation.setProperty).toHaveBeenNthCalledWith(4, undefined);

    manager.set('b', 'd', model);
    expect(mockModelLocation.setProperty).toHaveBeenNthCalledWith(5, undefined);

    manager.set('food', 'ta da', model);
    expect(mockModelLocation.setProperty).toHaveBeenNthCalledWith(6, 'ta da');
  });

  test('should track references in interpolated variable strings correctly', () => {
    manager.registerReference(mockModelLocation as PropertyLocation, '${a} and ${b}');
    expect(mockModelLocation.setProperty).toHaveBeenNthCalledWith(1, undefined);

    manager.set('b', 'bar', model);
    expect(mockModelLocation.setProperty).toHaveBeenNthCalledWith(2, undefined);
    manager.set('a', 'foo', model);
    expect(mockModelLocation.setProperty).toHaveBeenNthCalledWith(3, 'foo and bar');
  });

  test('should handle deregistration of references', () => {
    manager.registerReference(mockModelLocation as PropertyLocation, '${test}');
    expect(mockModelLocation.setProperty).toHaveBeenNthCalledWith(1, undefined);

    expect(manager.isVariableReference(mockModelLocation as PropertyLocation)).toBe(true);

    expect(manager.deregisterReference(mockModelLocation as PropertyLocation)).toBe('${test}');

    expect(manager.isVariableReference(mockModelLocation as PropertyLocation)).toBe(false);

    manager.set('test', 'foo', model);
    expect(mockModelLocation.setProperty).toHaveBeenCalledTimes(1);
  });

  test('deregister throws error if location does contain reference', () => {
    mockLogger.error = jest.fn(() => ({
      throw: () => {
        throw Error();
      }
    }));

    expect(() => manager.deregisterReference(mockModelLocation as PropertyLocation)).toThrow();

    expect(mockLogger.error)
      // tslint:disable-next-line:max-line-length
      .toHaveBeenCalledWith(
        'Attempted to deregister reference at modelProp which does not contain a registered reference'
      );
  });

  test('can determine strings containing a variable expression', () => {
    expect(manager.isVariableExpression('test')).toBe(false);
    expect(manager.isVariableExpression('${test}')).toBe(true);
    expect(manager.isVariableExpression('test ${test}')).toBe(true);
    expect(manager.isVariableExpression('{}')).toBe(false);
    expect(manager.isVariableExpression('')).toBe(false);
    expect(manager.isVariableExpression('${${nes}${ted}}')).toBe(true);
    expect(manager.isVariableExpression('${}')).toBe(true);
    expect(manager.isVariableExpression('some ${bad')).toBe(true);
    expect(manager.isVariableExpression('${${nested}${bad}')).toBe(true);
  });

  test('registering a reference returns the resolved value', () => {
    expect(manager.registerReference(mockModelLocation as PropertyLocation, '${test}')).toBeUndefined();
    manager.set('test', 'foo', parent);
    expect(manager.registerReference(mockParentLocation as PropertyLocation, '${test}')).toBe('foo');

    manager.deregisterReference(mockParentLocation as PropertyLocation);

    manager.set('bar', 'baz', parent);
    expect(manager.registerReference(mockParentLocation as PropertyLocation, '${test} + ${bar}')).toBe('foo + baz');
  });

  test('allows retrieving a variable expression without deregistering', () => {
    manager.registerReference(mockModelLocation as PropertyLocation, 'Hi: ${test}');

    manager.set('test', 'foo', model);

    expect(mockModelLocation.setProperty).lastCalledWith('Hi: foo');

    expect(manager.getVariableExpressionFromLocation(mockModelLocation as PropertyLocation)).toBe('Hi: ${test}');

    manager.set('test', 'bar', model);

    expect(mockModelLocation.setProperty).lastCalledWith('Hi: bar');
  });

  test('getVariableExpressionFromLocation throws error if location does contain reference', () => {
    mockLogger.error = jest.fn(() => ({
      throw: () => {
        throw Error();
      }
    }));

    expect(() => manager.getVariableExpressionFromLocation(mockModelLocation as PropertyLocation)).toThrow();

    expect(mockLogger.error)
      // tslint:disable-next-line:max-line-length
      .toHaveBeenCalledWith(
        'Attempted to resolve reference at modelProp which does not contain a registered reference'
      );
  });
});
