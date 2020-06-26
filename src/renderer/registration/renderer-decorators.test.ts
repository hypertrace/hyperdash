import { PartialObjectMock } from '../../test/partial-object-mock';
import { deferredRendererDecoratorRegistrations, Renderer } from './renderer-decorators';
import { RendererLibrary } from './renderer-registration';

describe('Renderer decorators', () => {
  let mockRendererLibrary: PartialObjectMock<RendererLibrary>;
  const testModelClass = class {};

  @Renderer({ modelClass: testModelClass })
  class RendererClass {}

  beforeEach(() => {
    mockRendererLibrary = {
      registerRendererClass: jest.fn()
    };

    deferredRendererDecoratorRegistrations.forEach(deferred => deferred(mockRendererLibrary as RendererLibrary));
  });

  test('can be used to register decorator class', () => {
    expect(mockRendererLibrary.registerRendererClass).toHaveBeenCalledWith(RendererClass, {
      modelClass: testModelClass
    });
  });
});
