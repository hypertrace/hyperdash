
// eslint-disable-next-line import/no-unassigned-import
import 'core-js/proposals/reflect-metadata';
import { Constructable, UnknownConstructable } from '../constructable';

// Augment Reflect object for core-js polyfill. Would prefer to drop this but core-js is missing good types
// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace Reflect {
  // eslint-disable-next-line prefer-arrow/prefer-arrow-functions
  function getMetadata<T = unknown>(
    metadataKey: unknown,
    target: object,
    targetKey?: number | string | symbol
  ): T | undefined;
}

const PROPERTY_TYPE_METADATA_KEY = 'design:type';

/**
 * Returns any design type metadata for the requested property. Returns undefined if
 * type cannot be resolved. Certain types, like intersections, unions and interfaces
 * will always return Object, as they do not have a runtime representation.
 */
export const getReflectedPropertyType = <T extends object>(
  classConstructor: Constructable<T>,
  propertyKey: keyof T
): UnknownConstructable | undefined => {
  const reflectedResult = Reflect.getMetadata<UnknownConstructable>(
    PROPERTY_TYPE_METADATA_KEY,
    classConstructor.prototype as T,
    propertyKey as string | symbol
  );

  return reflectedResult;
};
