import { DeserializationManager } from '../../../persistence/deserialization/deserialization-manager';
import { JsonPrimitive, ModelJson } from '../../../persistence/model-json';
import { SerializationManager } from '../../../persistence/serialization/serialization-manager';
import { ModelChangedEvent } from '../../events/model-changed-event';
import { ModelManager } from '../../manager/model-manager';
import { ModelPropertyTypeLibrary } from '../../property/model-property-type-library';
import { PropertyLocation } from '../../property/property-location';
import { LeafEditorData, UnresolvedCompositeEditorData } from '../editor-library';
import { DefaultEditorApi } from './default-editor-api';
import { EditorApi } from './editor-api';

/**
 * Factory for producing editor APIs
 */
export class EditorApiFactory {
  public constructor(
    private readonly modelChangedEvent: ModelChangedEvent,
    private readonly serializationManager: SerializationManager,
    private readonly deserializationManager: DeserializationManager,
    private readonly modelManager: ModelManager,
    private readonly modelPropertyTypeLibrary: ModelPropertyTypeLibrary
  ) {}

  /**
   * Produce a new editor API object for the provided model and leaf editor data
   */
  public buildLeafEditorApi<T extends JsonPrimitive>(model: object, editorData: LeafEditorData): EditorApi<T> {
    const propertyLocation = (PropertyLocation.forModelProperty(
      model,
      editorData.propertyMetadata.runtimeKey
    ) as unknown) as PropertyLocation;

    return new DefaultEditorApi<T, unknown>(
      editorData.title,
      editorData.propertyMetadata.type,
      model,
      editorData.validator,
      propertyLocation,
      this.modelChangedEvent,
      this.serializationManager,
      this.deserializationManager,
      this.modelManager,
      this.modelPropertyTypeLibrary
    );
  }

  /**
   * Produces a new editor API object for the provided model and composite editor data
   */
  public buildNestedEditorApi(model: object, editorData: UnresolvedCompositeEditorData): EditorApi<ModelJson> {
    const noOpValidator = () => undefined;
    const propertyLocation = editorData.getPropertyLocation<unknown>(model);

    const api = new DefaultEditorApi<ModelJson | undefined, unknown>(
      editorData.title,
      editorData.propertyTypeInstance,
      model,
      noOpValidator,
      propertyLocation,
      this.modelChangedEvent,
      this.serializationManager,
      this.deserializationManager,
      this.modelManager,
      this.modelPropertyTypeLibrary
    );

    if (api.value === undefined) {
      api.value = this.buildDefaultJson(editorData);
    }

    return api as EditorApi<ModelJson>;
  }

  private buildDefaultJson(editorData: UnresolvedCompositeEditorData): ModelJson {
    const model = this.modelManager.create(editorData.modelClass);
    const json = this.serializationManager.serialize<object, ModelJson>(model);
    this.modelManager.destroy(model);

    return json;
  }
}
