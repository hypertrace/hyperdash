import { PropertyLocation } from '../../../model/property/property-location';
import { VariableManager } from '../../../variable/manager/variable-manager';
import { Serializer } from '../serializer';

/**
 * Handles deserialization for variable strings representing any type of value
 */
export class VariableSerializer implements Serializer<unknown, string> {
  public constructor(private readonly variableManager: VariableManager) {}
  /**
   * @inheritdoc
   */
  public canSerialize(_value: unknown, location?: PropertyLocation): _value is unknown {
    return location ? this.variableManager.isVariableReference(location) : false;
  }

  /**
   * @inheritdoc
   */
  public serialize(_value: unknown, location: PropertyLocation): string {
    return this.variableManager.getVariableExpressionFromLocation(location);
  }
}
