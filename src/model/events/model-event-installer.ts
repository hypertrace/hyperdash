// tslint:disable:strict-type-predicates TODO - re-enable, does not work well with unknowns
import { CompletionObserver, ErrorObserver, NextObserver, Observable, PartialObserver } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DashboardEventKey, DashboardEventManager } from '../../communication/dashboard-event-manager';
import { ModelScopedDashboardEvent } from '../../communication/model-scoped-dashboard-event';
import { Constructable, ObjectConstructable } from '../../util/constructable';
import { Logger } from '../../util/logging/logger';
import { ModelDecorator } from '../manager/model-manager';
import { ModelDestroyedEvent } from './model-destroyed-event';

/**
 * Hooks up model event subscribers and publishers to the event system
 */
export class ModelEventInstaller implements ModelDecorator {
  private readonly modelEventMetadata: Map<ObjectConstructable, ModelEventMetadata[]> = new Map();
  private lastDeferredIndexRead: number = 0;

  public constructor(
    private readonly dashboardEventManager: DashboardEventManager,
    private readonly modelDestroyedEvent: ModelDestroyedEvent,
    private readonly logger: Logger
  ) {}

  /**
   *  Hooks up model event subscribers and publishers properties in modelInstance based on
   *  those registered to modelInstance's model type
   */
  public decorate(modelInstance: object): void {
    const eventMetadata = this.lookupModelEvents(modelInstance.constructor as ObjectConstructable);

    eventMetadata.forEach(metadata => {
      const propertyKey = metadata.propertyKey as keyof typeof modelInstance;
      const eventKey = this.resolveEventKey(metadata.eventKey);
      switch (metadata.type) {
        case ModelEventMetadataType.Subscriber:
          this.installEventSubscriber(modelInstance, eventKey, propertyKey);
          break;
        case ModelEventMetadataType.Publisher:
          this.installEventPublisher(modelInstance, eventKey, propertyKey);
          break;
        /* istanbul ignore next */
        default:
      }
    });
  }

  /**
   * Registers a model event. This property will be hooked into the event system as a publisher or subscriber
   * of the specified event for each model instance instantiated of this type.
   */
  public registerModelEvent<T extends object>(
    modelClass: Constructable<T>,
    propertyKey: keyof T,
    eventKey: DashboardEventKey,
    type: ModelEventMetadataType
  ): void {
    if (!this.modelEventMetadata.has(modelClass)) {
      this.modelEventMetadata.set(modelClass, []);
    }

    const eventMetadataArray = this.modelEventMetadata.get(modelClass)!;

    eventMetadataArray.push({
      propertyKey: propertyKey,
      eventKey: eventKey,
      type: type
    });
  }

  /**
   * A hook to allow extended implementations to support other systems such as Dependency
   * Injection
   */
  protected resolveEventKey(providedKey: DashboardEventKey): DashboardEventKey {
    return providedKey;
  }

  private installEventSubscriber<T extends object>(
    modelInstance: T,
    eventKey: DashboardEventKey,
    propertyKey: keyof T
  ): void {
    this.getObservableForModel(modelInstance, eventKey)
      .pipe(takeUntil(this.modelDestroyedEvent.getDestructionObservable(modelInstance)))
      .subscribe(this.getSubscriberAsObserver(modelInstance, propertyKey));
  }

  private installEventPublisher<T extends object>(
    modelInstance: T,
    eventKey: DashboardEventKey,
    propertyKey: keyof T
  ): void {
    const publisherPropertyValue = modelInstance[propertyKey] as unknown;

    if (publisherPropertyValue instanceof Observable) {
      publisherPropertyValue
        .pipe(takeUntil(this.modelDestroyedEvent.getDestructionObservable(modelInstance)))
        .subscribe((value: unknown) => this.getPublishFunctionForModel(modelInstance, eventKey)(value));
    } else {
      this.logger
        // tslint:disable-next-line:max-line-length
        .warn(`Cannot publish from property [${String(propertyKey)}] - must be an instanceof Observable`);
    }
  }

  private getSubscriberAsObserver<T extends object>(
    modelInstance: T,
    subscriberKey: keyof T
  ): PartialObserver<unknown> {
    const subscriberValue = modelInstance[subscriberKey];

    if (typeof subscriberValue === 'function') {
      return {
        next: (subscriberValue as unknown) as (value: unknown) => void
      };
    }
    if (this.isObserver(subscriberValue)) {
      return subscriberValue;
    }

    this.logger.warn(`Cannot subscribe to property [${String(subscriberKey)}] - must be function or Observer`);

    return {
      next: () => {
        /*NOOP*/
      }
    };
  }

  private isObserver(value: unknown): value is PartialObserver<unknown> {
    if (value === null || typeof value !== 'object') {
      return false;
    }

    if (typeof (value as NextObserver<unknown>).next === 'function') {
      return true;
    }

    if (typeof (value as CompletionObserver<unknown>).complete === 'function') {
      return true;
    }

    if (typeof (value as ErrorObserver<unknown>).error === 'function') {
      return true;
    }

    return false;
  }

  private getObservableForModel(model: object, eventKey: DashboardEventKey): Observable<unknown> {
    if (this.eventKeyIsModelScoped(eventKey)) {
      return eventKey.getObservableForModel(model);
    }

    return this.dashboardEventManager.getObservableForEvent(eventKey);
  }

  private getPublishFunctionForModel(model: object, eventKey: DashboardEventKey): (data: unknown) => void {
    if (this.eventKeyIsModelScoped(eventKey)) {
      return data =>
        eventKey.publish({
          data: data,
          source: model
        });
    }

    return data => this.dashboardEventManager.publishEvent(eventKey, data);
  }

  private eventKeyIsModelScoped(eventKey: DashboardEventKey): eventKey is ModelScopedDashboardEvent<unknown> {
    return eventKey instanceof ModelScopedDashboardEvent;
  }

  private lookupModelEvents(modelClass: ObjectConstructable): ModelEventMetadata[] {
    this.processRegistrationQueue();

    return this.getConstructorChain(modelClass)
      .reverse()
      .reduce<ModelEventMetadata[]>(
        (metadata, constructor) => metadata.concat(this.modelEventMetadata.get(constructor) || []),
        []
      );
  }

  private getConstructorChain(constructor: ObjectConstructable): ObjectConstructable[] {
    let currentConstructor: ObjectConstructable | undefined = constructor;
    const constructorChain: ObjectConstructable[] = [];

    while (currentConstructor) {
      constructorChain.push(currentConstructor);
      currentConstructor = Object.getPrototypeOf(currentConstructor) as ObjectConstructable | undefined;
    }

    return constructorChain;
  }

  private processRegistrationQueue(): void {
    for (
      this.lastDeferredIndexRead;
      this.lastDeferredIndexRead < deferredRegistrations.length;
      this.lastDeferredIndexRead++
    ) {
      const deferredRegistration = deferredRegistrations[this.lastDeferredIndexRead];
      deferredRegistration(this);
    }
  }
}

type DeferredRegistration = (installer: ModelEventInstaller) => void;
const deferredRegistrations: DeferredRegistration[] = [];

/**
 * Registers the decorated property or method as a subscriber for the provided event key or event key provider.
 *
 * As a property, an event subscriber must be instantiated to an object that implements the RxJS `Observer` interface.
 * As a method, an event subscriber will be invoked on each `Observer.next`, and provided as an argument any data
 * included with the event.
 */
// tslint:disable-next-line:only-arrow-functions
export function ModelEventSubscriber(event: DashboardEventKey): MethodDecorator & PropertyDecorator {
  return (modelPrototype: object, propertyKey: string | symbol): void => {
    deferredRegistrations.push(installer =>
      installer.registerModelEvent(
        modelPrototype.constructor as ObjectConstructable,
        propertyKey as keyof object,
        event,
        ModelEventMetadataType.Subscriber
      )
    );
  };
}

/**
 * Registers the decorated property or method as a publisher for the provided event key or event key provider.
 *
 * The property must be insantiated to an object that extends the RxJS `Observable` class.
 */
// tslint:disable-next-line:only-arrow-functions
export function ModelEventPublisher(event: DashboardEventKey): PropertyDecorator {
  return (modelPrototype: object, propertyKey: string | symbol): void => {
    deferredRegistrations.push(installer =>
      installer.registerModelEvent(
        modelPrototype.constructor as ObjectConstructable,
        propertyKey as keyof object,
        event,
        ModelEventMetadataType.Publisher
      )
    );
  };
}

/**
 * Metadata describing an event system hook on a model property
 */
export interface ModelEventMetadata {
  /**
   * Key for the referenced event
   */
  eventKey: DashboardEventKey;
  /**
   * Runtime key for the referencing model property
   */
  propertyKey: string | symbol | number;
  /**
   * Type of event system hook
   */
  type: ModelEventMetadataType;
}

/**
 * Indicates the type of event action metadata registered for a model
 */
export const enum ModelEventMetadataType {
  /**
   * An event subscriber
   */
  Subscriber,
  /**
   * An event publisher
   */
  Publisher
}
