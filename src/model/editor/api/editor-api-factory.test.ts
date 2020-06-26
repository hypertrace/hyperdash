import { DeserializationManager } from '../../../persistence/deserialization/deserialization-manager';
import { SerializationManager } from '../../../persistence/serialization/serialization-manager';
import { PartialObjectMock } from '../../../test/partial-object-mock';
import { ModelChangedEvent } from '../../events/model-changed-event';
import { ModelManager } from '../../manager/model-manager';
import { ModelPropertyTypeLibrary } from '../../property/model-property-type-library';
import { PropertyLocation } from '../../property/property-location';
import { EditorKind, LeafEditorData, UnresolvedCompositeEditorData } from '../editor-library';
import { DefaultEditorApi } from './default-editor-api';
import { EditorApiFactory } from './editor-api-factory';

describe('Editor API factory', () => {
  let editorApiFactory: EditorApiFactory;
  let mockModelChangedEvent: PartialObjectMock<ModelChangedEvent>;
  let mockSerializationManager: PartialObjectMock<SerializationManager>;
  let mockDeserializationManager: PartialObjectMock<DeserializationManager>;
  let mockModelManager: PartialObjectMock<ModelManager>;
  let mockModelPropertyTypeLibrary: PartialObjectMock<ModelPropertyTypeLibrary>;

  beforeEach(() => {
    mockModelChangedEvent = {};
    mockSerializationManager = {
      serialize: jest.fn((val: unknown) => `Serialized: ${String(val)}`)
    };
    mockDeserializationManager = {};
    mockModelManager = {};
    mockModelPropertyTypeLibrary = {
      getPropertySerializer: jest.fn()
    };

    editorApiFactory = new EditorApiFactory(
      mockModelChangedEvent as ModelChangedEvent,
      mockSerializationManager as SerializationManager,
      mockDeserializationManager as DeserializationManager,
      mockModelManager as ModelManager,
      mockModelPropertyTypeLibrary as ModelPropertyTypeLibrary
    );
  });
  test('returns an editor API instance for leaf data', () => {
    const model = {
      prop: 'initial value'
    };
    const editorData = {
      propertyMetadata: {
        runtimeKey: 'prop',
        type: {
          key: 'mock-key'
        }
      },
      title: 'mock title'
    };
    const editorApi = editorApiFactory.buildLeafEditorApi<string>(model, editorData as LeafEditorData);

    expect(editorApi).toBeInstanceOf(DefaultEditorApi);

    expect(editorApi.label).toBe('mock title');
    expect(editorApi.value).toBe('Serialized: initial value');
    expect(editorApi.propertyTypeInstance).toEqual({ key: 'mock-key' });
  });

  test('returns an editor API instance for unresolved data', () => {
    const modelClass = class {
      public prop: string = 'initial value';
    };
    const model = new modelClass();

    const editorData: UnresolvedCompositeEditorData = {
      title: 'mock title',
      getPropertyLocation: jest.fn().mockReturnValueOnce(PropertyLocation.forModelProperty(model, 'prop')),
      modelClass: modelClass,
      propertyTypeInstance: {
        key: 'mock-key'
      },
      kind: EditorKind.Unresolved
    };

    const editorApi = editorApiFactory.buildNestedEditorApi(model, editorData);

    expect(editorApi).toBeInstanceOf(DefaultEditorApi);

    expect(editorApi.label).toBe('mock title');
    expect(editorApi.value).toBe('Serialized: initial value');

    expect(editorApi.propertyTypeInstance).toEqual({ key: 'mock-key' });

    expect(editorApi.validate({ type: 'any' })).toBeUndefined(); // Should always work
  });

  test('sets empty model json if unresolved data corresponds to unset property', () => {
    const modelClass = class {
      public prop?: object;
    };

    const defaultValue = {};

    const model = new modelClass();
    const childModel = new modelClass();
    (mockSerializationManager.serialize as jest.Mock).mockReturnValueOnce(undefined).mockReturnValueOnce(defaultValue);

    mockModelManager.create = jest.fn().mockReturnValue(childModel);
    mockModelManager.destroy = jest.fn();

    const editorData: UnresolvedCompositeEditorData = {
      title: 'mock title',
      getPropertyLocation: jest.fn().mockReturnValueOnce(PropertyLocation.forModelProperty(model, 'prop')),
      modelClass: modelClass,
      propertyTypeInstance: {
        key: 'mock-key'
      },
      kind: EditorKind.Unresolved
    };

    const editorApi = editorApiFactory.buildNestedEditorApi(model, editorData);

    expect(editorApi.value).toBe(defaultValue);

    expect(mockModelManager.create).toHaveBeenCalledWith(modelClass);

    expect(mockSerializationManager.serialize).toHaveBeenCalledWith(childModel);

    expect(mockModelManager.destroy).toHaveBeenCalledWith(childModel);
  });
});
