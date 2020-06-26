import { ReplaySubject } from 'rxjs';
import { getTestScheduler } from '../test/rxjs-jest-test-scheduler';
import { DashboardEventManager } from './dashboard-event-manager';

describe('Dashboard event manager', () => {
  let manager: DashboardEventManager;
  const basicEvent = {};
  let replay: ReplaySubject<unknown>;

  beforeEach(() => {
    manager = new DashboardEventManager();
    replay = new ReplaySubject<unknown>();
    manager.getObservableForEvent(basicEvent).subscribe(replay);
  });

  test('supports publishing to a new subject, then subscribing', () => {
    getTestScheduler().run(({ expectObservable }) => {
      // Use a different event def for this test, since we want to publish before the subscription starts
      const otherEventDef = {};

      // Pub/sub is hot, this should be ignored
      manager.publishEvent(otherEventDef, 'before subscribe');

      manager.getObservableForEvent(otherEventDef).subscribe(replay);

      manager.publishEvent(otherEventDef, 'after 1');
      manager.publishEvent(otherEventDef, 'after 2');

      expectObservable(replay).toBe('(ab)', { a: 'after 1', b: 'after 2' });
    });
  });

  test('supports subscribing to a new subject, then publishing', () => {
    getTestScheduler().run(({ expectObservable }) => {
      manager.publishEvent(basicEvent, 'after');

      expectObservable(replay).toBe('a', { a: 'after' });
    });
  });

  test('only subscribed to events are notified', () => {
    getTestScheduler().run(({ expectObservable }) => {
      const secondEvent = {};
      const secondReplay = new ReplaySubject<unknown>();
      manager.getObservableForEvent(secondEvent).subscribe(secondReplay);

      manager.publishEvent(basicEvent, 'basic');
      manager.publishEvent(secondEvent, 'second');

      expectObservable(replay).toBe('a', { a: 'basic' });
      expectObservable(secondReplay).toBe('a', { a: 'second' });
    });
  });
});
