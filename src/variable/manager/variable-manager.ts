import { fromPairs } from 'lodash-es';
import { BeforeModelDestroyedEvent } from '../../model/events/before-model-destroyed-event';
import { ModelChangedEvent } from '../../model/events/model-changed-event';
import { ModelManager } from '../../model/manager/model-manager';
import { PropertyLocation } from '../../model/property/property-location';
import { Logger } from '../../util/logging/logger';
import { EvaluationResult } from '../evaluator/variable-evaluator';
import { ExpressionParser } from '../parser/expression-parser';
import { ParseNodeType } from '../parser/parse-node';
import { VariableReference } from '../reference/variable-reference';
import { VariableValue } from '../value/variable-value';
import { ResolveDictionary, VariableDictionary } from '../variable-dictionary';

/**
 * Variable manager handles read, write and update of variable values,
 * supporting serialization and deserialization to convert variables into
 * values and back.
 */
export class VariableManager {
  private readonly variableDictionaries: WeakMap<object, VariableDictionary> = new WeakMap();
  private readonly variableReferences: WeakMap<object, Map<string, VariableReference>> = new WeakMap();

  public constructor(
    private readonly logger: Logger,
    private readonly modelManager: ModelManager,
    private readonly modelChangedEvent: ModelChangedEvent,
    private readonly beforeModelDestroyedEvent: BeforeModelDestroyedEvent
  ) {}

  /**
   * Assign a value to the given key and scope. Scope should be a model object.
   */
  public set(key: string, value: unknown, modelScope: object): void {
    if (!this.variableDictionaries.has(modelScope)) {
      this.variableDictionaries.set(modelScope, new Map());
    }
    const variableDictionary = this.variableDictionaries.get(modelScope)!;

    if (variableDictionary.has(key)) {
      variableDictionary.get(key)!.currentValue = value;
    } else {
      const newValue = this.createVariableValue(key, value);
      this.shadowExistingReferencesIfNeeded(modelScope, newValue);
      variableDictionary.set(key, newValue);
    }

    this.updateAllReferences(variableDictionary.get(key)!);
  }

  /**
   * Retrieves a value for the given key. If that value has been assigned in this scope,
   * it will be returned. Otherwise, scopes will be searched upwards in the model tree
   * returning undefined if no match is found.
   */
  public get<T = unknown>(key: string, modelScope: object): T | undefined {
    const variableValue = this.getVariableValue<T>(key, modelScope);
    if (!variableValue) {
      this.logger.warn(`Attempting to lookup unassigned variable: ${key}`);
    }

    return variableValue && variableValue.currentValue;
  }

  /**
   * Indicates whether the provided key is registered, accessible at the given scope
   * and returns a defined value.
   */
  public has(key: string, modelScope: object): boolean {
    const variableValue = this.getVariableValue<unknown>(key, modelScope);

    return variableValue ? variableValue.currentValue !== undefined : false;
  }

  /**
   * Begin tracking the provided expression at `location`. The value will be set based on
   * variables, and updated as variables changed.
   *
   * Throws Error if the provided location is already being tracked
   */
  public registerReference(location: PropertyLocation, variableExpression: string): unknown {
    let reference = new VariableReference(variableExpression, location);

    const referenceMap = this.getOrCreateReferenceMapForModelContainingLocation(location);

    if (referenceMap.has(location.toString())) {
      this.logger.error(`Attempting to register reference which has already been declared at ${location.toString()}`);
      reference = referenceMap.get(location.toString())!;
    } else {
      referenceMap.set(location.toString(), reference);
    }

    this.beforeModelDestroyedEvent
      .getBeforeDestructionObservable(location.parentModel)
      .subscribe(() => this.deregisterReference(location));

    return this.updateReference(reference);
  }

  /**
   * Indicates whether the value at `location` is currently being tracked as a variable reference
   */
  public isVariableReference(location: PropertyLocation): boolean {
    return !!this.getReferenceAtLocation(location);
  }

  /**
   * Indicates whether the provided string should be treated as a variable expression
   */
  public isVariableExpression(potentialExpression: string): boolean {
    const parsed = new ExpressionParser(potentialExpression).parse();

    return parsed.children.some(child => child.type === ParseNodeType.Expression);
  }

  /**
   * Ends tracking for the variable at `location`. Returns the original variable string.
   * The value at `location` is left as is.
   *
   * Throws Error if the provided location is not being tracked
   */
  public deregisterReference(location: PropertyLocation): string {
    const reference = this.getReferenceAtLocation(location);

    if (!reference) {
      return this.logger
        .error(
          `Attempted to deregister reference at ${location.toString()} which does not contain a registered reference`
        )
        .throw();
    }

    this.getOrCreateReferenceMapForModelContainingLocation(location).delete(reference.location.toString());

    const result = reference.unresolve();
    this.updateValueReferenceTrackingFromEvaluationResult(reference, result);

    return result.value!;
  }

  /**
   * Retrieves the original variable expression from `location`. This value will continue
   * to be tracked.
   *
   * Throws Error if the provided location is not being tracked
   */
  public getVariableExpressionFromLocation(location: PropertyLocation): string {
    const reference = this.getReferenceAtLocation(location);

    if (!reference) {
      return this.logger
        .error(`Attempted to resolve reference at ${location.toString()} which does not contain a registered reference`)
        .throw();
    }
    /* Unresolve is stateful, but it *should* be OK. on the following resolution, it will think new variables are being
       used, but we're using sets so the extra references should be deduped
    */
    const expression = reference.unresolve().value!;

    return expression;
  }

  private getParentModelScope(modelScope: object): object | undefined {
    const parentModel = this.modelManager.getParent(modelScope);
    if (!parentModel) {
      return undefined;
    }

    return this.variableDictionaries.has(parentModel) ? parentModel : this.getParentModelScope(parentModel);
  }

  private createVariableValue<T>(key: string, value: T): VariableValue<T> {
    return {
      key: key,
      currentValue: value,
      references: new Set()
    };
  }

  private updateAllReferences(value: VariableValue<unknown>): void {
    value.references.forEach(reference => this.updateReference(reference));
  }

  private updateReference(reference: VariableReference): unknown {
    const modelScope = reference.location.parentModel;
    const result = reference.resolve(this.getResolveDictionaryForModel(modelScope));
    this.updateValueReferenceTrackingFromEvaluationResult(reference, result);
    this.modelChangedEvent.publishChange(reference.location.parentModel);

    return result.value;
  }

  private getReferenceAtLocation(location: PropertyLocation): VariableReference | undefined {
    const referenceMapForModel = this.variableReferences.get(location.parentModel);
    if (referenceMapForModel) {
      return referenceMapForModel.get(location.toString());
    }

    return undefined;
  }

  private getDictionaryContainingKey(key: string, modelScope: object): VariableDictionary | undefined {
    const dictionaryWithRequestedScope = this.variableDictionaries.get(modelScope);
    if (dictionaryWithRequestedScope && dictionaryWithRequestedScope.has(key)) {
      return dictionaryWithRequestedScope;
    }

    const parent = this.getParentModelScope(modelScope);

    return parent ? this.getDictionaryContainingKey(key, parent) : undefined;
  }

  private getOrCreateReferenceMapForModelContainingLocation(
    location: PropertyLocation
  ): Map<string, VariableReference> {
    if (!this.variableReferences.has(location.parentModel)) {
      this.variableReferences.set(location.parentModel, new Map());
    }

    return this.variableReferences.get(location.parentModel)!;
  }

  private getResolveDictionaryForModel(modelScope: object): ResolveDictionary {
    const variablePairs: [string, VariableValue<unknown>][] = [];
    let nextModelScope = this.variableDictionaries.has(modelScope) ? modelScope : this.getParentModelScope(modelScope);

    while (nextModelScope) {
      // Later takes precedence, so we always unshift on to beginning
      variablePairs.unshift(...this.variableDictionaries.get(nextModelScope)!);
      nextModelScope = this.getParentModelScope(nextModelScope);
    }

    return fromPairs(variablePairs.map(([key, value]) => [key, value.currentValue]));
  }

  private getVariableValue<T>(key: string, modelScope: object): VariableValue<T> | undefined {
    const dictionaryWithKey = this.getDictionaryContainingKey(key, modelScope);

    return dictionaryWithKey && (dictionaryWithKey.get(key) as VariableValue<T> | undefined);
  }

  private updateValueReferenceTrackingFromEvaluationResult(
    reference: VariableReference,
    evaluationResult: EvaluationResult<unknown>
  ): void {
    const modelScope = reference.location.parentModel;
    evaluationResult.variableNamesRemoved.forEach(name => {
      // Every variable name previously referenced should have a placeholder
      this.getVariableValue(name, modelScope)!.references.delete(reference);
    });

    evaluationResult.variableNamesAdded.forEach(name => {
      if (!this.has(name, modelScope)) {
        this.addPlaceholderVariable(name, modelScope);
      }
      this.getVariableValue(name, modelScope)!.references.add(reference);
    });
  }

  private shadowExistingReferencesIfNeeded(modelScope: object, newVariableValue: VariableValue<unknown>): void {
    // References registered before this new value may be inside this scope and should be switched over
    const parentModelScope = this.getParentModelScope(modelScope);
    const parentDictionary =
      parentModelScope && this.getDictionaryContainingKey(newVariableValue.key, parentModelScope);
    if (!parentDictionary) {
      return; // This variable is not shadowing any other
    }
    const existingReferences = parentDictionary.get(newVariableValue.key)!.references;

    const referencesToUpdate: VariableReference[] = [];

    existingReferences.forEach(reference => {
      if (
        reference.location.parentModel === modelScope ||
        this.modelManager.isAncestor(reference.location.parentModel, modelScope)
      ) {
        referencesToUpdate.push(reference);
      }
    });

    referencesToUpdate.forEach(referenence => {
      existingReferences.delete(referenence);
      newVariableValue.references.add(referenence);
    });
  }

  private addPlaceholderVariable(variableName: string, modelScope: object): void {
    this.set(variableName, undefined, this.modelManager.getRoot(modelScope));
  }
}
