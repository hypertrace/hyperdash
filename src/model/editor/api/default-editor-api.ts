import { DeserializationManager } from '../../../persistence/deserialization/deserialization-manager';
import { JsonPrimitive } from '../../../persistence/model-json';
import { SerializationManager } from '../../../persistence/serialization/serialization-manager';
import { ModelChangedEvent } from '../../events/model-changed-event';
import { ModelManager } from '../../manager/model-manager';
import { ModelPropertyTypeInstance, ModelPropertyTypeLibrary } from '../../property/model-property-type-library';
import { PropertyLocation } from '../../property/property-location';
import { EditorApi } from './editor-api';

/**
 * Default implementation of `EditorApi`
 */
export class DefaultEditorApi<TSerialized extends JsonPrimitive, TDeserialized>
  implements EditorApi<TSerialized, TDeserialized> {
  /**
   * @inheritdoc
   */
  public value: TSerialized;

  public constructor(
    public readonly label: string,
    public readonly propertyTypeInstance: ModelPropertyTypeInstance,
    private readonly model: object,
    private readonly validator: (value: unknown) => string | undefined,
    private readonly propertyLocation: PropertyLocation<TDeserialized>,
    private readonly modelChangedEvent: ModelChangedEvent,
    private readonly serializer: SerializationManager,
    private readonly deserializer: DeserializationManager,
    private readonly modelManager: ModelManager,
    private readonly modelPropertyTypeLibrary: ModelPropertyTypeLibrary
  ) {
    this.value = this.getValue();
  }

  /**
   * @inheritdoc
   */
  public validate(newSerializedValue: TSerialized): string | undefined {
    return this.validator(newSerializedValue);
  }

  /**
   * @inheritdoc
   */
  public valueChange(newSerializedValue: TSerialized): void {
    this.setValue(newSerializedValue);
    this.value = this.getValue();
  }

  private getValue(): TSerialized {
    return this.serialize(this.propertyLocation.getProperty()!);
  }

  private setValue(serializedValue: TSerialized): void {
    // TODO variables
    if (this.validator(serializedValue) !== undefined) {
      return; // If non empty validation message, don't accept the change
    }
    this.modelManager.destroy(this.propertyLocation.getProperty());

    this.propertyLocation.setProperty(this.deserialize(serializedValue));

    this.modelChangedEvent.publishChange(this.model);
  }

  /**
   * @inheritdoc
   */
  public serialize(value: TDeserialized): TSerialized {
    const customSerializer = this.modelPropertyTypeLibrary.getPropertySerializer<TDeserialized, TSerialized>(
      this.propertyTypeInstance
    );
    if (customSerializer) {
      return customSerializer(value, this.propertyLocation, this.propertyTypeInstance);
    }

    return this.serializer.serialize(value, this.propertyLocation);
  }

  /**
   * @inheritdoc
   */
  public deserialize(value: TSerialized): TDeserialized {
    const customDeserializer = this.modelPropertyTypeLibrary.getPropertyDeserializer<TSerialized, TDeserialized>(
      this.propertyTypeInstance
    );
    if (customDeserializer) {
      return customDeserializer(value, this.propertyLocation, this.propertyTypeInstance);
    }

    return this.deserializer.deserialize<TDeserialized>(value, this.propertyLocation);
  }
}
