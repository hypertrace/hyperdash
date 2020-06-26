import { PropertyLocation } from '../../model/property/property-location';

describe('Property location', () => {
  let mockSetter: jest.Mock<unknown>;
  let mockGetter: jest.Mock<unknown>;
  let parentModel: { [key: string]: unknown };

  beforeEach(() => {
    parentModel = {};
    mockSetter = jest.fn();
    mockGetter = jest.fn().mockReturnValue('mock getter');
  });

  test('returns property name from to string', () => {
    expect(new PropertyLocation(parentModel, 'propertyName', mockSetter, mockGetter).toString()).toEqual(
      'propertyName'
    );
  });

  test('calls provided setter', () => {
    new PropertyLocation(parentModel, 'propertyName', mockSetter, mockGetter).setProperty('hi');
    expect(mockSetter).toHaveBeenCalledWith('hi');
  });

  test('can build child with concatenated key and setter', () => {
    const original = new PropertyLocation<{ [key: string]: unknown }>(
      parentModel,
      'propertyName',
      mockSetter,
      mockGetter as jest.Mock
    );
    const objectToSet = {};
    const childLocation = original.buildChildFromObjectAndKey(objectToSet, 'prop');
    expect(childLocation.toString()).toBe('propertyName:prop');
    expect(childLocation.parentModel).toBe(parentModel);
    childLocation.setProperty(15);
    expect<unknown>(objectToSet).toEqual({ prop: 15 });
    expect(childLocation.getProperty()).toBe(15);
  });

  test('can build location for model property', () => {
    const modelLocation = PropertyLocation.forModelProperty(parentModel, 'parentProp');
    expect(modelLocation.toString()).toBe('parentProp');
    expect(modelLocation.parentModel).toBe(parentModel);
    modelLocation.setProperty(16);
    expect(parentModel).toEqual({ parentProp: 16 });
    expect(modelLocation.getProperty()).toBe(16);
  });

  test('calls validator if defined', () => {
    const validator = jest.fn(val => {
      if (val === 'valid') {
        return;
      }
      throw Error('invalid');
    });

    const modelLocation = new PropertyLocation(parentModel, 'propertyName', mockSetter, mockGetter).withValidator(
      validator
    );

    modelLocation.setProperty('valid');

    expect(validator).toHaveBeenCalledWith('valid');
    expect(mockSetter).toHaveBeenCalledWith('valid');

    expect(() => modelLocation.setProperty('invalid')).toThrow();

    expect(validator).toHaveBeenCalledWith('invalid');
    expect(mockSetter).not.toHaveBeenCalledWith('invalid');
  });

  test('calls provided getter', () => {
    expect(new PropertyLocation(parentModel, 'propertyName', mockSetter, mockGetter).getProperty()).toBe('mock getter');
    expect(mockGetter).toHaveBeenCalled();
  });

  test('can build location for unassigned child models', () => {
    const parent = {};
    const location = PropertyLocation.forUnassignedChildModel(parent);
    expect(location.parentModel).toBe(parent);
    expect(location.toString()).toBe('UNASSIGNED');

    expect(() => location.setProperty(undefined)).toThrow();
    expect(() => location.getProperty()).toThrow();
  });
});
