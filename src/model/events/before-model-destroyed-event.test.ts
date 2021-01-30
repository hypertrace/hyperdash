import { DashboardEventManager } from '../../communication/dashboard-event-manager';
import { getTestScheduler } from '../../test/rxjs-jest-test-scheduler';
import { BeforeModelDestroyedEvent } from './before-model-destroyed-event';

describe('Before model destroyed event', () => {
  let mockEventManager: Partial<DashboardEventManager>;
  let beforeModelDestroyedEvent: BeforeModelDestroyedEvent;

  beforeEach(() => {
    mockEventManager = {};
    beforeModelDestroyedEvent = new BeforeModelDestroyedEvent(mockEventManager as DashboardEventManager);
  });
  test('relays all publishes to manager', () => {
    mockEventManager.publishEvent = jest.fn();
    const first = {};
    const second = {};
    beforeModelDestroyedEvent.publish(first);
    beforeModelDestroyedEvent.publish(second);

    expect(mockEventManager.publishEvent).toHaveBeenCalledTimes(2);

    expect(mockEventManager.publishEvent).nthCalledWith(1, beforeModelDestroyedEvent.getKey(), first);

    expect(mockEventManager.publishEvent).nthCalledWith(2, beforeModelDestroyedEvent.getKey(), second);
  });

  test('gets observable from manager for this event', () => {
    mockEventManager.getObservableForEvent = jest.fn();

    beforeModelDestroyedEvent.getObservable();

    expect(mockEventManager.getObservableForEvent).toHaveBeenCalledWith(beforeModelDestroyedEvent.getKey());
  });

  test('before destruction observables notifies on the provided model then completes', () => {
    getTestScheduler().run(({ cold, expectObservable }) => {
      const mockModels = {
        a: {},
        b: {}
      };
      beforeModelDestroyedEvent.getObservable = jest.fn().mockReturnValue(cold('a-b-', mockModels));

      expectObservable(beforeModelDestroyedEvent.getBeforeDestructionObservable(mockModels.a)).toBe('(a|)', {
        a: undefined
      });

      expectObservable(beforeModelDestroyedEvent.getBeforeDestructionObservable(mockModels.b)).toBe('--(b|)', {
        b: undefined
      });
    });
  });
});
