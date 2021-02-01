// tslint:disable:no-invalid-template-strings
import { Subscription } from 'rxjs';
import { PropertyLocation } from '../../model/property/property-location';
import { EvaluationResult, VariableEvaluator } from '../evaluator/variable-evaluator';
import { VariableReference } from './variable-reference';

jest.mock('../evaluator/variable-evaluator');
const mockedVariableEvaluatorConstructor = VariableEvaluator as jest.Mock<VariableEvaluator>;

describe('Variable reference', () => {
  let mockLocation: Partial<PropertyLocation>;
  let mockEvaluationResult: Partial<EvaluationResult<unknown>>;
  let mockUnevaluationResult: Partial<EvaluationResult<unknown>>;
  const closeSubscription: Subscription = new Subscription();

  beforeEach(() => {
    mockedVariableEvaluatorConstructor.mockReset();
    mockEvaluationResult = {
      value: Symbol('eval')
    };
    mockUnevaluationResult = {
      value: Symbol('uneval')
    };
    mockedVariableEvaluatorConstructor.mockImplementation(
      () =>
        (({
          evaluate: jest.fn().mockReturnValue(mockEvaluationResult),
          unevaluate: jest.fn().mockReturnValue(mockUnevaluationResult)
        } as unknown) as VariableEvaluator)
    );
    mockLocation = {
      setProperty: jest.fn()
    };
  });

  test('resolve sets the property to the evaluation result', () => {
    const ref = new VariableReference('${test}', mockLocation as PropertyLocation, closeSubscription);

    expect(ref.resolve({})).toBe(mockEvaluationResult);
    expect(mockLocation.setProperty).toHaveBeenCalledWith(mockEvaluationResult.value);
  });

  test('unresolve returns the unevaluate result', () => {
    const ref = new VariableReference('${test}', mockLocation as PropertyLocation, closeSubscription);
    expect(ref.unresolve()).toBe(mockUnevaluationResult);
  });
});
