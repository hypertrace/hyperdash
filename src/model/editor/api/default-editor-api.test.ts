import { DeserializationManager } from '../../../persistence/deserialization/deserialization-manager';
import { SerializationManager } from '../../../persistence/serialization/serialization-manager';
import { PartialObjectMock } from '../../../test/partial-object-mock';
import { ModelChangedEvent } from '../../events/model-changed-event';
import { ModelManager } from '../../manager/model-manager';
import { ModelPropertyTypeLibrary } from '../../property/model-property-type-library';
import { PropertyLocation } from '../../property/property-location';
import { DefaultEditorApi } from './default-editor-api';

describe('Default editor API', () => {
  interface TestModel {
    prop: string;
  }

  let editorApi: DefaultEditorApi<string, unknown>;
  let model: TestModel;
  let propertyLocation: PropertyLocation;
  let mockModelChangedEvent: PartialObjectMock<ModelChangedEvent>;
  let mockSerializationManager: PartialObjectMock<SerializationManager>;
  let mockDeserializationManager: PartialObjectMock<DeserializationManager>;
  let mockModelManager: PartialObjectMock<ModelManager>;
  let mockModelPropertyTypeLibrary: PartialObjectMock<ModelPropertyTypeLibrary>;
  let mockValidator: jest.Mock;
  const buildApi = () => {
    editorApi = new DefaultEditorApi(
      'Property editor',
      { key: 'prop-type' },
      model,
      mockValidator,
      propertyLocation,
      mockModelChangedEvent as ModelChangedEvent,
      mockSerializationManager as SerializationManager,
      mockDeserializationManager as DeserializationManager,
      mockModelManager as ModelManager,
      mockModelPropertyTypeLibrary as ModelPropertyTypeLibrary
    );
  };

  beforeEach(() => {
    model = {
      prop: 'initial value'
    };

    propertyLocation = PropertyLocation.forModelProperty(model, 'prop') as PropertyLocation;

    mockModelChangedEvent = {
      publishChange: jest.fn()
    };
    mockSerializationManager = {
      serialize: jest.fn(val => `Serialized: ${String(val)}`)
    };
    mockDeserializationManager = {
      deserialize: jest.fn(val => `Deserialized: ${String(val)}`)
    };
    mockModelManager = {
      destroy: jest.fn()
    };
    mockModelPropertyTypeLibrary = {
      getPropertySerializer: jest.fn(),
      getPropertyDeserializer: jest.fn()
    };

    mockValidator = jest.fn(value => (value === 'expected' ? undefined : 'Value was not expected'));

    buildApi();
  });

  test('should provide the serialized value', () => {
    expect(editorApi.value).toBe('Serialized: initial value');
  });

  test('should provide the label for the property', () => {
    expect(editorApi.label).toBe('Property editor');
  });

  test('should give access to the validator from the editor data', () => {
    expect(editorApi.validate('random')).toBe('Value was not expected');

    expect(editorApi.validate('expected')).toBeUndefined();
  });

  test('calls model change event and updates with deserialized value when the valueChange callback is invoked', () => {
    editorApi.valueChange('expected');

    expect(mockModelChangedEvent.publishChange).toHaveBeenCalledWith(model);

    expect(model.prop).toBe('Deserialized: expected');
    expect(editorApi.value).toBe('Serialized: Deserialized: expected');
  });

  test('does not call model change or update value when valueChange is invoked if validation fails', () => {
    editorApi.valueChange('not expected');

    expect(mockModelChangedEvent.publishChange).not.toHaveBeenCalledWith(model);

    expect(model.prop).toBe('initial value');

    expect(mockModelManager.destroy).not.toHaveBeenCalled();
  });

  test('destroys values before overwriting them', () => {
    editorApi.valueChange('expected');
    expect(mockModelManager.destroy).toHaveBeenCalledWith('initial value');
  });

  test('delegates to custom serializer', () => {
    mockModelPropertyTypeLibrary.getPropertySerializer = jest.fn(() => (val: unknown) =>
      `custom serializer: ${String(val)}`
    );
    buildApi();
    expect(editorApi.value).toBe('custom serializer: initial value');

    expect(editorApi.serialize('some value')).toBe('custom serializer: some value');

    editorApi.valueChange('expected');
    expect(editorApi.value).toBe('custom serializer: Deserialized: expected');
  });

  test('delegates to custom deserializer', () => {
    mockModelPropertyTypeLibrary.getPropertyDeserializer = jest.fn(() => (val: unknown) =>
      `custom deserializer: ${String(val)}`
    );
    buildApi();

    editorApi.valueChange('expected');
    expect(editorApi.value).toBe('Serialized: custom deserializer: expected');

    expect(editorApi.deserialize('some value')).toBe('custom deserializer: some value');
  });
});
