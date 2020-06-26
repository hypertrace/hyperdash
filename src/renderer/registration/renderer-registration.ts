import { UnknownConstructable } from '../../util/constructable';
import { Logger } from '../../util/logging/logger';
import { deferredRendererDecoratorRegistrations } from './renderer-decorators';

/**
 * Renderer Library allows rendererer classes to be associated with model classes
 */
export class RendererLibrary {
  private readonly rendererMetadata: Map<UnknownConstructable, UnknownConstructable> = new Map();
  private lastDeferredIndexRead: number = 0;
  private currentlyProcessingDeferred: boolean = false;

  public constructor(private readonly logger: Logger) {}

  /**
   * Registers the provided render class to a given model class. No action is taken if that
   * model already has a renderer.
   */
  public registerRendererClass(
    rendererClass: UnknownConstructable,
    registrationInformation: RendererRegistrationInformation
  ): void {
    if (this.hasRenderer(registrationInformation.modelClass)) {
      this.logger.error(
        `Model classes may only have one renderer. Attempted to register [${rendererClass.name}] ` +
          `to [${registrationInformation.modelClass.name}], but model already registered with ` +
          `[${this.rendererMetadata.get(registrationInformation.modelClass)!.name}]`
      );

      return;
    }

    this.rendererMetadata.set(registrationInformation.modelClass, rendererClass);
  }

  /**
   * Retrieves the renderer class associated with the provided model class. Returns
   * undefined if the model class has not been registered to a renderer.
   */
  public lookupRenderer(modelClass: UnknownConstructable): UnknownConstructable | undefined {
    if (this.hasRenderer(modelClass)) {
      return this.rendererMetadata.get(modelClass)!;
    }
    this.logger.warn(`No renderer registered for model: [${modelClass.name}]`);

    return undefined;
  }

  /**
   * Returns true if `modelClass` has a renderer, false otherwise.
   */
  public hasRenderer(modelClass: UnknownConstructable): boolean {
    this.processRegistrationQueue();

    return this.rendererMetadata.has(modelClass);
  }

  private processRegistrationQueue(): void {
    if (this.currentlyProcessingDeferred) {
      return; // Lazy shortcut lock to prevent infinitely looping on this
    }
    this.currentlyProcessingDeferred = true;
    // tslint:disable-next-line:max-line-length
    for (
      this.lastDeferredIndexRead;
      this.lastDeferredIndexRead < deferredRendererDecoratorRegistrations.length;
      this.lastDeferredIndexRead++
    ) {
      const deferredRegistration = deferredRendererDecoratorRegistrations[this.lastDeferredIndexRead];
      deferredRegistration(this);
    }
    this.currentlyProcessingDeferred = false;
  }
}

/**
 * Describes a model renderer
 */
export interface RendererRegistrationInformation {
  /**
   * The model class this renderer is associated with
   */
  modelClass: UnknownConstructable;
}
