import { PropertyLocation } from '../../../model/property/property-location';
import { VariableManager } from '../../../variable/manager/variable-manager';
import { JsonPrimitive } from '../../model-json';
import { Deserializer } from '../deserializer';

/**
 * Handles deserialization for variable strings representing any type of value
 */
export class VariableDeserializer implements Deserializer {
  public constructor(private readonly variableManager: VariableManager) {}
  /**
   * @inheritdoc
   */
  public canDeserialize(json: JsonPrimitive): json is string {
    return typeof json === 'string' && this.variableManager.isVariableExpression(json);
  }

  /**
   * @inheritdoc
   */
  public deserialize(json: string, location: PropertyLocation): unknown {
    return this.variableManager.registerReference(location, json);
  }
}
