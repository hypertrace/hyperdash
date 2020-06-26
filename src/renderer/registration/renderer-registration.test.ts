import { Logger } from '../../util/logging/logger';
import { deferredRendererDecoratorRegistrations } from './renderer-decorators';
import { RendererLibrary } from './renderer-registration';

describe('Renderer', () => {
  const testModelClass = class TestModelClass {};
  const testRendererClass = class TestRendererClass {};
  let library: RendererLibrary;
  let mockLogger: Partial<Logger>;

  beforeEach(() => {
    mockLogger = {};
    library = new RendererLibrary(mockLogger as Logger);
  });

  test('can be registered to a model', () => {
    library.registerRendererClass(testRendererClass, {
      modelClass: testModelClass
    });

    expect(library.lookupRenderer(testModelClass)).toBe(testRendererClass);
  });

  test('can not register more than one renderer to a model', () => {
    mockLogger.error = jest.fn();

    library.registerRendererClass(testRendererClass, {
      modelClass: testModelClass
    });

    library.registerRendererClass(class SecondRendererClass {}, {
      modelClass: testModelClass
    });

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Model classes may only have one renderer. Attempted to register [SecondRendererClass] ' +
        'to [TestModelClass], but model already registered with [TestRendererClass]'
    );
  });

  test('warn and return undefined trying to lookup model without a renderer', () => {
    mockLogger.warn = jest.fn();

    expect(library.lookupRenderer(testModelClass)).toBeUndefined();
    expect(mockLogger.warn).toHaveBeenCalledWith('No renderer registered for model: [TestModelClass]');
  });

  test('supports registrations before renderer library construction', () => {
    deferredRendererDecoratorRegistrations.length = 0;
    deferredRendererDecoratorRegistrations.push(providedLib =>
      providedLib.registerRendererClass(testRendererClass, { modelClass: testModelClass })
    );
    library = new RendererLibrary(mockLogger as Logger);

    expect(library.lookupRenderer(testModelClass)).toBe(testRendererClass);
  });

  test('supports registrations after renderer library construction', () => {
    deferredRendererDecoratorRegistrations.length = 0;
    deferredRendererDecoratorRegistrations.push(providedLib =>
      providedLib.registerRendererClass(testRendererClass, { modelClass: testModelClass })
    );

    expect(library.lookupRenderer(testModelClass)).toBe(testRendererClass);
  });
});
