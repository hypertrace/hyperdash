import { Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';

/**
 * Orchestrates publishing and subscribing to events throughout the dashboarding system,
 * provides weakly typed APIs for publishing and subscribing. Using these APIs directly is discouraged,
 * instead use typed APIs provided by specific events.
 */
export class DashboardEventManager {
  private readonly eventSubject: Subject<KeyedDashboardEvent> = new Subject();

  /**
   * Returns an `Observable` notifying when the provided eventKey is published to. This must be
   * manually disposed of, as events are an infinite stream and thus never terminate on their own.
   */
  public getObservableForEvent<T>(eventKey: DashboardEventKey): Observable<T> {
    return this.eventSubject.pipe(
      filter(keyedEvent => keyedEvent.key === eventKey),
      map(keyedEvent => keyedEvent.value as T)
    );
  }

  /**
   * Publishes the provided value to the provided eventKey. Any registered subscribers will
   * be notified.
   */
  public publishEvent<T>(eventKey: DashboardEventKey, value: T): void {
    this.eventSubject.next({
      key: eventKey,
      value: value
    });
  }
}

/**
 * An event key for a routeable dashboard event. This is used to publish and subscribe
 */
export type DashboardEventKey = object | symbol;

interface KeyedDashboardEvent {
  /**
   * Dashboard event key
   */
  key: DashboardEventKey;
  /**
   * Value of event
   */
  value: unknown;
}
