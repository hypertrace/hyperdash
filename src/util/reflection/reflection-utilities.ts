// tslint:disable-next-line:no-import-side-effect no-submodule-imports
import 'core-js/proposals/reflect-metadata';
import { Constructable, UnknownConstructable } from '../constructable';

// Augment Reflect object for core-js polyfill. Would prefer to drop this but core-js is missing good types
// tslint:disable-next-line:no-namespace
declare namespace Reflect {
  // tslint:disable-next-line:only-arrow-functions
  function getMetadata<T = unknown>(
    metadataKey: unknown,
    target: object,
    targetKey?: string | symbol | number
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
