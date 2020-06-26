/**
 * A property location represents a position in the model tree.
 */
export class PropertyLocation<T = unknown> {
  /**
   * Creates a property location for a direct property of a model
   */
  public static forModelProperty<T extends object, P extends keyof T>(model: T, property: P): PropertyLocation<T[P]> {
    return new PropertyLocation(
      model,
      property,
      val => (model[property] = val!),
      () => model[property]
    );
  }

  /**
   * Creates a property location for a newly created child model with no location assignment. This location will convey
   * the parent model, but will not allow setting or getting.
   */
  public static forUnassignedChildModel(parentModel: object): PropertyLocation<never> {
    return new PropertyLocation(
      parentModel,
      PropertyLocation.UNASSIGNED_LOCATION,
      () => {
        throw Error('Setter not supported for Unassigned child');
      },
      () => {
        throw Error('Getter not supported for Unassigned child');
      }
    );
  }

  private static readonly UNASSIGNED_LOCATION: string = 'UNASSIGNED';

  private validator?: (value: T | undefined) => void;

  public constructor(
    public readonly parentModel: object,
    private readonly propertyKey: string | number | symbol,
    private readonly setter: (value: T | undefined) => void,
    private readonly getter: () => T | undefined
  ) {}

  /**
   * Adds validation function that will be run each time before invoking the setter
   */
  public withValidator(validator: (value: unknown) => void): this {
    this.validator = validator;

    return this;
  }

  /**
   * Sets the location with the provided value, first validating it if provided with a validator
   */
  public setProperty(value: T | undefined): void {
    if (this.validator) {
      this.validator(value);
    }
    this.setter(value);
  }

  /**
   * Gets the value from the provided location
   */
  public getProperty(): T | undefined {
    return this.getter();
  }

  /**
   * Converts the location to a string representation. All
   * locations with the same parentModel will have a unique string
   * representation.
   */
  public toString(): string {
    return String(this.propertyKey);
  }

  /**
   * Creates a property location nested from the current one. object represents the object in the current
   * location, `propertyKey` is the path from that object to the new location. The parent model is retained.
   * If object is a model, it should use `PropertyLocation.forModelProperty` instead.
   */
  public buildChildFromObjectAndKey<TKey extends keyof T>(object: T, propertyKey: TKey): PropertyLocation<T[TKey]> {
    return new PropertyLocation<T[TKey]>(
      this.parentModel,
      `${this.toString()}:${String(propertyKey)}`,
      value => (object[propertyKey] = value!),
      () => object[propertyKey]
    );
  }
}
