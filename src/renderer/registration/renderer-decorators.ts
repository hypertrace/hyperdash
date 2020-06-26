import { UnknownConstructable } from '../../util/constructable';
import { RendererLibrary, RendererRegistrationInformation } from './renderer-registration';

export type DeferredRendererDecoratorRegistration = (rendererLibrary: RendererLibrary) => void;
export const deferredRendererDecoratorRegistrations: DeferredRendererDecoratorRegistration[] = [];

/**
 * Registers the decorated renderer with the provided information
 */
// tslint:disable-next-line:only-arrow-functions
export function Renderer(registrationInfo: RendererRegistrationInformation): (target: UnknownConstructable) => void {
  return (rendererClass: UnknownConstructable): void => {
    deferredRendererDecoratorRegistrations.push(rendererLibrary =>
      rendererLibrary.registerRendererClass(rendererClass, registrationInfo)
    );
  };
}
