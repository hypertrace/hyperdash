import { PartialObjectMock } from '../../../test/partial-object-mock';
import { Logger } from '../../../util/logging/logger';
import { ModelPropertyTypeLibrary, PropertyValidatorFunction } from '../model-property-type-library';
import { ModelPropertyValidator } from './model-property-validator';

describe('Model property validator', () => {
  let validator: ModelPropertyValidator;
  let mockModelPropertyTypeLibrary: Partial<ModelPropertyTypeLibrary>;
  let mockLogger: PartialObjectMock<Logger>;
  let mockValidatorFunction: jest.Mock<PropertyValidatorFunction>;

  beforeEach(() => {
    mockValidatorFunction = jest.fn().mockReturnValue('mock error');
    mockLogger = {
      warn: jest.fn(),
      error: jest.fn((message: string) => ({
        throw: () => {
          throw Error(message);
        }
      }))
    };
    mockModelPropertyTypeLibrary = {
      getValidator: jest.fn().mockReturnValue(mockValidatorFunction)
    };
    validator = new ModelPropertyValidator(
      mockModelPropertyTypeLibrary as ModelPropertyTypeLibrary,
      mockLogger as Logger
    );
  });

  test('throws and logs error for validation errors', () => {
    mockModelPropertyTypeLibrary.getValidator = jest.fn().mockReturnValue((val: unknown) => {
      if (typeof val === 'string' && /[aeiou]/.test(val)) {
        return 'string properties should not contain vowels';
      }
    });

    expect(() =>
      validator.validate('vowels aplenty', {
        type: { key: 'string' },
        runtimeKey: 'vowelProp',
        key: 'vowelKey',
        displayName: 'Vowel Property',
        required: true,
        runtimeType: String
      })
    ).toThrow('Validation error for property [vowelProp]: string properties should not contain vowels');

    expect(mockLogger.error).toHaveBeenCalled();
    (mockLogger.error as jest.Mock).mockClear();
    expect(() =>
      validator.validate('n0 v0w3ls', {
        type: { key: 'string' },
        runtimeKey: 'noVowelProp',
        key: 'noVowelKey',
        displayName: 'No Vowel Property',
        required: true,
        runtimeType: String
      })
    ).not.toThrow();
  });

  test('validation only logs warning if validation is not strict', () => {
    validator.setStrictSchema(false);
    expect(() =>
      validator.validate(42, {
        type: { key: 'number' },
        runtimeKey: 'numberRuntimeKey',
        key: 'numberKey',
        displayName: 'Number',
        required: true,
        runtimeType: Number
      })
    ).not.toThrow();

    expect(mockLogger.warn).toHaveBeenLastCalledWith('Validation error for property [numberRuntimeKey]: mock error');
    expect(mockLogger.error).not.toHaveBeenCalled();

    (mockLogger.warn as jest.Mock).mockClear();

    validator.setStrictSchema(true);

    expect(() =>
      validator.validate(42, {
        type: { key: 'number' },
        runtimeKey: 'numberRuntimeKey',
        key: 'numberKey',
        displayName: 'Number',
        required: true,
        runtimeType: Number
      })
    ).toThrow();

    expect(mockLogger.error).toHaveBeenLastCalledWith('Validation error for property [numberRuntimeKey]: mock error');
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });
});
