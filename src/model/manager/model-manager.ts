import { cloneDeepWith, without } from 'lodash-es';
import { Constructable } from '../../util/constructable';
import { Logger } from '../../util/logging/logger';
import { ModelApiBuilder } from '../api/builder/model-api-builder';
import { ModelApi } from '../api/model-api';
import { BeforeModelDestroyedEvent } from '../events/before-model-destroyed-event';
import { ModelCreatedEvent } from '../events/model-created-event';
import { ModelDestroyedEvent } from '../events/model-destroyed-event';
import { ModelOnDestroy, ModelOnInit } from './model-lifecycle-hooks';

/**
 * Model Manager creates, destroys and tracks existing models. It is used to maintain relationships between
 * models.
 */
export class ModelManager {
  private readonly modelInstanceMap: WeakMap<object, ModelInstanceData> = new WeakMap();
  private readonly apiBuilders: ModelApiBuilder<ModelApi>[] = [];
  private readonly decorators: ModelDecorator[] = [];

  public constructor(
    private readonly logger: Logger,
    private readonly modelCreatedEvent: ModelCreatedEvent,
    private readonly modelDestroyedEvent: ModelDestroyedEvent,
    private readonly beforeModelDestroyedEvent: BeforeModelDestroyedEvent
  ) {}

  /**
   * Returns a shallow copy array of model instances that match the argument model class
   */
  public getModelInstances<T extends object>(modelClass: Constructable<T>, root: object): object[] {
    let found: object[] = [];

    if (root instanceof modelClass) {
      found = [...found, root];
    }

    this.modelInstanceMap
      .get(root)
      ?.children.forEach(child => (found = [...found, ...this.getModelInstances(modelClass, child)]));

    return found;
  }

  /**
   * Constructs (@see `ModelManager.construct`) then initializes (@see `ModelManager.initialize`) it
   *
   * Throws Error if a parent is provided which is not tracked
   */
  public create<T extends object>(modelClass: Constructable<T>, parent?: object): T {
    return this.initialize(this.construct(modelClass, parent));
  }

  /**
   * Initializes the provided model instance, calling appropriate lifecycle hooks and marking it
   * ready.
   */
  public initialize<T extends object>(modelInstance: T): T {
    if (this.modelHasInitHook(modelInstance)) {
      modelInstance.modelOnInit();
    }

    return modelInstance;
  }

  /**
   * Constructs the provided class, tracking its relationships to other models based on the provided
   * parent.
   *
   * Models must be created through this method and cannot take constructor parameters.
   *
   * This does not initialize the model, which must be done separately. @see `ModelManager.initialize`
   *
   * Throws Error if a parent is provided which is not tracked
   */
  public construct<T extends object>(modelClass: Constructable<T>, parent?: object): T {
    const instance = new modelClass();

    this.modelInstanceMap.set(instance, {
      parent: parent,
      children: []
    });

    if (parent) {
      this.trackNewChild(parent, instance);
    }

    const modelApi = this.buildApiForModel(instance);

    this.decorators.forEach(decorator => decorator.decorate(instance, modelApi));

    this.modelCreatedEvent.publish(instance);

    return instance;
  }

  /**
   * Untracks any model instances descending from the provided value.
   *
   * If `value` is a model, it will be untracked along with its descendents, starting from the leaf of the model tree.
   * That is, a child will always be destroyed before its parent.
   *
   * If `value` is an array, each of its object-typed values will be recursively passed to this function.
   *
   * If `value` is a non-model, non-array object, each of its object-typed values will be recursively passed to this
   * function.
   *
   * If the value is a primitve or no model is found, no action is taken.
   */
  public destroy(value: unknown): void {
    if (typeof value !== 'object' || !value) {
      return;
    }
    if (this.modelInstanceMap.has(value)) {
      this.destroyModel(value);
    } else if (Array.isArray(value)) {
      value.forEach((arrayValue: unknown) => this.destroy(arrayValue));
    } else {
      Object.values(value).forEach((objectValue: unknown) => this.destroy(objectValue));
    }
  }

  /**
   * Returns a copy of the children registered to the provided model.
   *
   * Throws Error if the provided instance is not tracked
   */
  public getChildren(modelInstance: object): object[] {
    return this.getInstanceDataOrThrow(modelInstance).children;
  }

  /**
   * Returns the parent registered to the provided model, or undefined if
   * no parent is registered.
   *
   * Throws Error if the provided instance is not tracked
   */
  public getParent(modelInstance: object): object | undefined {
    return this.getInstanceDataOrThrow(modelInstance).parent;
  }

  /**
   * Returns the root node in the model tree to which the provided instance
   * belongs. Returns itself if the provided node is a root.
   *
   * Throws Error if the provided instance is not tracked
   */
  public getRoot(modelInstance: object): object {
    let currentModel = modelInstance;
    let currentModelParent = this.getParent(currentModel);
    while (currentModelParent) {
      currentModel = currentModelParent;
      currentModelParent = this.getParent(currentModel);
    }

    return currentModel;
  }

  /**
   * Returns true if `potentialAncestor` is an ancestor of `model`.
   * Returns false otherwise, including if `model === potentialAncestor`.
   * Throws Error if `model` is not tracked
   */
  public isAncestor(model: object, potentialAncestor: object): boolean {
    let currentAncestor: object | undefined = model;
    while (currentAncestor) {
      currentAncestor = this.getParent(currentAncestor);
      if (currentAncestor === potentialAncestor) {
        return true;
      }
    }

    return false;
  }

  /**
   * Adds the provided API builder to the search list. The first builder that matches a given model,
   * in the order registered, will be used.
   */
  public registerModelApiBuilder(modelApiBuilder: ModelApiBuilder<ModelApi>): void {
    this.apiBuilders.push(modelApiBuilder);
  }

  /**
   * Returns true if the provided value is a tracked model, false otherwise
   */
  public isTrackedModel(value: unknown): boolean {
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    return this.modelInstanceMap.has(value);
  }

  /**
   * Registeres a ModelDecorator which will be called when creating all future
   * model instances. @see `ModelDecorator`
   */
  public registerDecorator(decorator: ModelDecorator): void {
    this.decorators.push(decorator);
  }

  private removeChildFromParent(parent: object, childToRemove: object): void {
    const originalParentData = this.getInstanceDataOrThrow(parent);
    const newParentData = {
      ...originalParentData,
      children: without(originalParentData.children, childToRemove)
    };
    this.modelInstanceMap.set(parent, newParentData);
  }

  private trackNewChild(parent: object, newChild: object): void {
    const originalParentData = this.getInstanceDataOrThrow(parent);
    const newParentData = {
      ...originalParentData,
      children: originalParentData.children.concat(newChild)
    };
    this.modelInstanceMap.set(parent, newParentData);
  }

  private getInstanceDataOrThrow(instance: object): ModelInstanceData {
    if (!this.modelInstanceMap.has(instance)) {
      this.logger.warn('Could not retrieve data for provided instance, it has not been registered').throw();
    }

    // Make sure this isn't mutated by always returning a copy, only leaving actual models in tact
    const cloneFunction = (value: object) => (this.modelInstanceMap.has(value) ? value : undefined);

    return cloneDeepWith(this.modelInstanceMap.get(instance)!, cloneFunction) as ModelInstanceData;
  }

  private modelHasInitHook<T extends object>(model: T & Partial<ModelOnInit>): model is T & ModelOnInit {
    return typeof model.modelOnInit === 'function';
  }

  private modelHasDestroyHook<T extends object>(model: T & Partial<ModelOnDestroy>): model is T & ModelOnDestroy {
    return typeof model.modelOnDestroy === 'function';
  }

  private buildApiForModel(model: object): ModelApi {
    const matchingBuilder = this.apiBuilders.find(builder => builder.matches(model));

    if (!matchingBuilder) {
      return this.logger.error('No model API builder registered matching provided model').throw();
    }

    return matchingBuilder.build(model);
  }

  private destroyModel(modelInstance: object): void {
    const instanceData = this.getInstanceDataOrThrow(modelInstance);

    // Depth first, destroy children before self
    instanceData.children.forEach(child => this.destroy(child));

    this.beforeModelDestroyedEvent.publish(modelInstance);

    if (this.modelHasDestroyHook(modelInstance)) {
      modelInstance.modelOnDestroy();
    }

    if (instanceData.parent) {
      this.removeChildFromParent(instanceData.parent, modelInstance);
    }
    this.modelInstanceMap.delete(modelInstance);

    this.modelDestroyedEvent.publish(modelInstance);
  }
}

interface ModelInstanceData {
  /**
   * Parent of tracked model
   */
  readonly parent?: object;
  /**
   * Children of tracked model
   */
  readonly children: object[]; // No mutation!
}

/**
 * A decorator class that can optionally decorate created models.
 */
export interface ModelDecorator {
  /**
   * Will be invoked for each created model object before it is initialized and before the
   * creation event is published.
   */
  decorate(modelInstance: object, api: ModelApi): void;
}
