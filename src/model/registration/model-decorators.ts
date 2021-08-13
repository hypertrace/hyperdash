import { ObjectConstructable } from '../../util/constructable';
import { ModelLibrary, ModelPropertyRegistrationInformation, ModelRegistrationInformation } from './model-registration';

export type DeferredModelDecoratorRegistration = (modelLibrary: ModelLibrary) => void;
export const deferredModelDecoratorRegistrations: DeferredModelDecoratorRegistration[] = [];

/**
 * Registers the decorated model with the provided information
 */
// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
export function Model(registrationInfo: ModelRegistrationInformation): (target: ObjectConstructable) => void {
  return (modelClass: ObjectConstructable): void => {
    deferredModelDecoratorRegistrations.push(modelLibrary =>
      modelLibrary.registerModelClass(modelClass, registrationInfo)
    );
  };
}

/**
 * Registers the decorated property with the containing model
 */
// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
export function ModelProperty(registrationInfo: ModelPropertyRegistrationInformation): PropertyDecorator {
  return (modelPrototype: object, propertyKey: string | symbol): void => {
    deferredModelDecoratorRegistrations.push(modelLibrary =>
      modelLibrary.registerModelProperty(
        modelPrototype.constructor as ObjectConstructable,
        propertyKey as keyof object,
        registrationInfo
      )
    );
  };
}
