import { VariableReference } from '../reference/variable-reference';

/**
 * A variable in a dashboard which may have multiple references
 */
export interface VariableValue<T> {
  /**
   * The variable key - i.e 'a' for ${a}
   */
  key: string;
  /**
   * The current value of the variable
   */
  currentValue: T;
  /**
   * References to this variable
   */
  references: Set<VariableReference>;
}
