import { PartialObjectMock } from '../../test/partial-object-mock';
import { BOOLEAN_PROPERTY, NUMBER_PROPERTY } from '../property/predefined/primitive-model-property-types';
import { deferredModelDecoratorRegistrations, Model, ModelProperty } from './model-decorators';
import { ModelLibrary } from './model-registration';

describe('Model decorators', () => {
  const symbolKey: unique symbol = Symbol('symbol');
  let mockModelLibrary: PartialObjectMock<ModelLibrary>;

  @Model({
    type: 'test-model-decorator',
    displayName: 'Test Model Decorator'
  })
  class TestModelDecoratorClass {
    @ModelProperty({
      key: 'string',
      type: NUMBER_PROPERTY.type,
      displayName: 'String Key'
    })
    public stringKey!: number;

    @ModelProperty({
      key: 'symbol',
      type: BOOLEAN_PROPERTY.type,
      required: false
    })
    public [symbolKey]: boolean;
  }

  beforeEach(() => {
    mockModelLibrary = {
      registerModelClass: jest.fn(),
      registerModelProperty: jest.fn()
    };

    deferredModelDecoratorRegistrations.forEach(deferred => deferred(mockModelLibrary as ModelLibrary));
  });

  test('can be used to register classes', () => {
    expect(mockModelLibrary.registerModelClass).toHaveBeenCalledWith(TestModelDecoratorClass, {
      type: 'test-model-decorator',
      displayName: 'Test Model Decorator'
    });
  });

  test('can be used to register properties', () => {
    expect(mockModelLibrary.registerModelProperty).toHaveBeenCalledWith(TestModelDecoratorClass, 'stringKey', {
      key: 'string',
      type: NUMBER_PROPERTY.type,
      displayName: 'String Key'
    });
    expect(mockModelLibrary.registerModelProperty).toHaveBeenCalledWith(TestModelDecoratorClass, symbolKey, {
      key: 'symbol',
      type: BOOLEAN_PROPERTY.type,
      required: false
    });
  });
});
