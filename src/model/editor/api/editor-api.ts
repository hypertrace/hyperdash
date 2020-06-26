import { JsonPrimitive } from '../../../persistence/model-json';
import { ModelPropertyTypeInstance } from '../../property/model-property-type-library';

/**
 * API object for editor renderers to display and update a model property.
 * The editor works in serialized values.
 */
export interface EditorApi<TSerialized extends JsonPrimitive, TDeserialized = unknown> {
  /**
   * Current serialized value of the property. // TODO - may be a variable, which would allow something else here
   */
  value: TSerialized;
  /**
   * Display label for this property
   */
  label: string;
  /**
   * Property type instance for this property
   */
  propertyTypeInstance: ModelPropertyTypeInstance;
  /**
   * Callback to be invoked to update the current value of this property. This will NOOP
   * if the new value does not pass validation. @see EditorApi.validate
   */
  valueChange(newValue: TSerialized): void;
  /**
   * Validation method to check if the new value is allowable. Will return error string if
   * not, otherwise, undefined.
   */
  validate(newValue: TSerialized): string | undefined;
  /**
   * Helper method to convert a potential value from its deserialized to serialized form,
   * which is what is accepted by `valueChange` and `validate`
   */
  serialize(deserializedValue: TDeserialized): TSerialized;
  /**
   * Helper method to convert a serialized from to its deserialized form,
   * which may be easier to work with in the editor. It must be converted back via `serialize`
   * before calling `validate` or `valueChange`
   */
  deserialize(serializedValue: TSerialized): TDeserialized;
}
