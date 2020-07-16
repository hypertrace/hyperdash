import { isEmpty } from 'lodash-es';
import { Logger } from '../../../util/logging/logger';
import { ModelPropertyMetadata } from '../../registration/model-registration';
import { ModelPropertyTypeLibrary } from '../model-property-type-library';

/**
 * Performs validation of a single value, warning or throwing an error based on configuration
 * if validation does not pass.
 */
export class ModelPropertyValidator {
  public constructor(
    private readonly modelPropertyTypeLibrary: ModelPropertyTypeLibrary,
    private readonly logger: Logger
  ) {}

  private strictSchema: boolean = true;

  /**
   * Performs the validation, throwing an error in strict mode or logging a warning otherwise
   */
  public validate<T extends object>(value: unknown, propertyMetadata: ModelPropertyMetadata<T>): void {
    const validator = this.modelPropertyTypeLibrary.getValidator(propertyMetadata.type);
    const error = validator(value, !propertyMetadata.required, propertyMetadata.type);

    if (isEmpty(error)) {
      return;
    }
    const errorMessage = `Validation error for property [${String(propertyMetadata.runtimeKey)}]: ${error}`;

    if (this.strictSchema) {
      return this.logger.error(errorMessage).throw();
    }

    this.logger.warn(errorMessage);
  }

  /**
   * If true, any validation errors are thrown as runtime errors
   */
  public setStrictSchema(checkSchema: boolean): void {
    this.strictSchema = checkSchema;
  }
}
