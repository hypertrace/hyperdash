import { DashboardEventManager } from '../../communication/dashboard-event-manager';
import { getTestScheduler } from '../../test/rxjs-jest-test-scheduler';
import { ModelDestroyedEvent } from './model-destroyed-event';

describe('Model destroyed event', () => {
  let mockEventManager: Partial<DashboardEventManager>;
  let modelDestroyedEvent: ModelDestroyedEvent;

  beforeEach(() => {
    mockEventManager = {};
    modelDestroyedEvent = new ModelDestroyedEvent(mockEventManager as DashboardEventManager);
  });
  test('relays all publishes to manager', () => {
    mockEventManager.publishEvent = jest.fn();
    const first = {};
    const second = {};
    modelDestroyedEvent.publish(first);
    modelDestroyedEvent.publish(second);

    expect(mockEventManager.publishEvent).toHaveBeenCalledTimes(2);

    expect(mockEventManager.publishEvent).nthCalledWith(1, modelDestroyedEvent.getKey(), first);

    expect(mockEventManager.publishEvent).nthCalledWith(2, modelDestroyedEvent.getKey(), second);
  });

  test('gets observable from manager for this event', () => {
    mockEventManager.getObservableForEvent = jest.fn();

    modelDestroyedEvent.getObservable();

    expect(mockEventManager.getObservableForEvent).toHaveBeenCalledWith(modelDestroyedEvent.getKey());
  });

  test('destruction observables notifies on the provided model then completes', () => {
    getTestScheduler().run(({ cold, expectObservable }) => {
      const mockModels = {
        a: {},
        b: {}
      };
      modelDestroyedEvent.getObservable = jest.fn().mockReturnValue(cold('a-b-', mockModels));

      expectObservable(modelDestroyedEvent.getDestructionObservable(mockModels.a)).toBe('(a|)', { a: undefined });

      expectObservable(modelDestroyedEvent.getDestructionObservable(mockModels.b)).toBe('--(b|)', { b: undefined });
    });
  });
});
