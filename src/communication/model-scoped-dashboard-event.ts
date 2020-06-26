import { Observable } from 'rxjs';
import { filter, map, takeUntil } from 'rxjs/operators';
import { modelDestroyedEventKey } from '../model/events/model-destroyed-event';
import { DashboardEvent } from './dashboard-event';
import { DashboardEventKey, DashboardEventManager } from './dashboard-event-manager';

/**
 * An event which is sourced from and scoped to a model. By default, the scope is the model
 * that generated the event.
 *
 * Decorated model event hooks will wrap and unwrap events of this type, respecting the provided scope.
 */
export class ModelScopedDashboardEvent<TData = undefined> extends DashboardEvent<ModelScopedData<TData>> {
  public constructor(dashboardEventManager: DashboardEventManager, eventKeyToUse?: DashboardEventKey) {
    super(dashboardEventManager, eventKeyToUse);
  }

  /**
   * Returns an observable that extracts the data from any events originating from a model
   * that satisfies the `modelShouldReceiveEvent` predicate
   */
  public getObservableForModel(model: object): Observable<TData> {
    return this.getObservable().pipe(
      filter(value => this.modelShouldReceiveEvent(model, value.source)),
      map(value => value.data),
      takeUntil(
        this.dashboardEventManager
          .getObservableForEvent(modelDestroyedEventKey)
          .pipe(filter(destroyedModel => destroyedModel === model))
      )
    );
  }

  /**
   * Returns true if an event originating from `eventSourceModel` should be propagated to a listener
   * from `listenerModel`
   */
  protected modelShouldReceiveEvent(listenerModel: object, eventSourceModel: object): boolean {
    return listenerModel === eventSourceModel;
  }
}

/**
 * An event occuring in the context of a model
 */
export interface ModelScopedData<TData> {
  /**
   * The model where the event ocurred
   */
  source: object;
  /**
   * Any data for this event
   */
  data: TData;
}
