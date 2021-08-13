import { isNil } from 'lodash-es';
import { ModelPropertyTypeInstance, PropertyValidatorFunction } from '../model-property-type-library';

const typeofValidator = (type: 'boolean' | 'number' | 'object' | 'string'): PropertyValidatorFunction => (
  value: unknown,
  allowUndefinedOrNull: boolean
) => {
  if (allowUndefinedOrNull && isNil(value)) {
    return undefined;
  }
  if (isNil(value)) {
    return `Required property got ${value} value`;
  }

  if (typeof value === type) {
    return undefined;
  }

  if (type === 'object') {
    return `Provided value is not an ${type}, detected: ${typeof value}`;
  }

  return `Provided value is not a ${type}, detected: ${typeof value}`;
};

export const STRING_PROPERTY = Object.freeze({
  type: 'string',
  validator: typeofValidator('string')
});

export const NUMBER_PROPERTY = Object.freeze({
  type: 'number',
  validator: typeofValidator('number')
});

export const BOOLEAN_PROPERTY = Object.freeze({
  type: 'boolean',
  validator: typeofValidator('boolean')
});

export const PLAIN_OBJECT_PROPERTY = Object.freeze({
  type: 'plain-object',
  validator: (value: unknown, allowUndefinedOrNull: boolean, propertyType: ModelPropertyTypeInstance) => {
    if (Array.isArray(value)) {
      return 'Provided value is not a plain object, detected: Array';
    }

    return typeofValidator('object')(value, allowUndefinedOrNull, propertyType);
  }
});

export const UNKNOWN_PROPERTY = Object.freeze({
  type: 'unknown',
  validator: (value: unknown, allowUndefinedOrNull: boolean) => {
    if (isNil(value) && !allowUndefinedOrNull) {
      return `Required property got ${value} value`;
    }

    return undefined;
  }
});
