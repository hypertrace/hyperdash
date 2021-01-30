import { Observable } from 'rxjs';
import { filter, mapTo, take } from 'rxjs/operators';
import { DashboardEvent } from '../../communication/dashboard-event';
import { DashboardEventManager } from '../../communication/dashboard-event-manager';

export const beforeModelDestroyedEventKey = Symbol('Before model destroyed');

/**
 * Fired before a model is destroyed and any destroy hooks are called.
 */
export class BeforeModelDestroyedEvent extends DashboardEvent<object> {
  public constructor(dashboardEventManager: DashboardEventManager) {
    super(dashboardEventManager, beforeModelDestroyedEventKey);
  }

  /**
   * Returns a void observable that will notify once when the provided model is
   * destroyed, then complete.
   */
  public getBeforeDestructionObservable(model: object): Observable<void> {
    return this.getObservable().pipe(
      filter(destroyedModel => destroyedModel === model),
      mapTo(undefined),
      take(1)
    );
  }
}
