import { Observable } from 'rxjs';
import { DashboardEventKey, DashboardEventManager } from './dashboard-event-manager';

/**
 * Dashboard event which supports observing and publishing itself. By default, the constructed instance is the key.
 * This can be changed at construction by providing an optional second argument.
 */
export class DashboardEvent<TData> {
  private readonly eventKey: DashboardEventKey = this;

  public constructor(
    protected readonly dashboardEventManager: DashboardEventManager,
    eventKeyToUse?: DashboardEventKey
  ) {
    if (eventKeyToUse) {
      this.eventKey = eventKeyToUse;
    }
  }

  /**
   * Gets an observable for this event which will be notified when anyone publishes to it
   */
  public getObservable(): Observable<TData> {
    return this.dashboardEventManager.getObservableForEvent(this.getKey());
  }

  /**
   * Publishes `data` to this event
   */
  public publish(data: TData): void {
    this.dashboardEventManager.publishEvent(this.getKey(), data);
  }

  /**
   * Returns the event key being used for this event
   */
  public getKey(): DashboardEventKey {
    return this.eventKey;
  }
}
