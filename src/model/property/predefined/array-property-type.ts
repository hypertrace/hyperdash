import { isNil } from 'lodash';

export const ARRAY_PROPERTY = Object.freeze({
  type: 'array',
  validator: (value: unknown, allowUndefinedOrNull: boolean) => {
    if (allowUndefinedOrNull && isNil(value)) {
      return undefined;
    }
    if (isNil(value)) {
      return `Required property got ${value} value`;
    }
    if (Array.isArray(value)) {
      return undefined;
    }

    return `Provided value is not an Array, detected: ${typeof value}`;
  }
});
