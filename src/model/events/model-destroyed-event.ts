import { Observable } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';
import { DashboardEvent } from '../../communication/dashboard-event';
import { DashboardEventManager } from '../../communication/dashboard-event-manager';

export const modelDestroyedEventKey = Symbol('Model destroyed');

/**
 * Fired after a model is destroyed and any destroy hooks are called.
 */
export class ModelDestroyedEvent extends DashboardEvent<object> {
  public constructor(dashboardEventManager: DashboardEventManager) {
    super(dashboardEventManager, modelDestroyedEventKey);
  }

  /**
   * Returns a void observable that will notify once when the provided model is
   * destroyed, then complete.
   */
  public getDestructionObservable(model: object): Observable<void> {
    return this.getObservable().pipe(
      filter(destroyedModel => destroyedModel === model),
      map(_ => undefined),
      take(1)
    );
  }
}
