import { STRING_PROPERTY } from '../model/property/predefined/primitive-model-property-types';
import { Model, ModelProperty } from '../model/registration/model-decorators';
import { ModelJson } from '../persistence/model-json';

/**
 * A theme describing how to style a specific model.
 */
@Model({
  type: 'theme',
  displayName: 'Theme'
})
export class Theme {
  /**
   * Background color. Accessible via key `background-color`.
   */
  @ModelProperty({
    key: 'background-color',
    type: STRING_PROPERTY.type,
    required: false
  })
  public backgroundColor?: string;

  /**
   * Text color. Accessible via key `text-color`.
   */
  @ModelProperty({
    key: 'text-color',
    type: STRING_PROPERTY.type,
    required: false
  })
  public textColor?: string;
}

/**
 * A JSON object representing a model with associated theme JSON
 */
export interface ModelJsonWithTheme extends ModelJson {
  /**
   * Theme JSON
   */
  theme: ModelJson;
}

export type MergedTheme<T extends Theme> = Required<T>;
