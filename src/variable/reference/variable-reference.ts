import { Subscription } from 'rxjs';
import { PropertyLocation } from '../../model/property/property-location';
import { EvaluationResult, VariableEvaluator } from '../evaluator/variable-evaluator';
import { ResolveDictionary } from '../variable-dictionary';

/**
 * A reference to one or more variables at a specific location.
 */
export class VariableReference<T = unknown> {
  private readonly evaluator: VariableEvaluator<T>;

  public constructor(
    variableString: string,
    public readonly location: PropertyLocation<T>,
    public readonly autoCleanupSubscription: Subscription
  ) {
    this.evaluator = new VariableEvaluator(variableString);
  }

  /**
   * Using the provided dictionary, assigns the location with the resolved variable(s).
   */
  public resolve(dictionary: ResolveDictionary): EvaluationResult<T> {
    const result = this.evaluator.evaluate(dictionary);
    this.location.setProperty(result.value);

    return result;
  }

  /**
   * Returns the original variable expression value. Does not assign it.
   */
  public unresolve(): EvaluationResult<string> {
    return this.evaluator.unevaluate();
  }
}
