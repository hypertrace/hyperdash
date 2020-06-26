import { DashboardEventManager } from '../../communication/dashboard-event-manager';
import { ModelCreatedEvent } from './model-created-event';

describe('Model created event', () => {
  let mockEventManager: Partial<DashboardEventManager>;
  let modelCreatedEvent: ModelCreatedEvent;

  beforeEach(() => {
    mockEventManager = {};
    modelCreatedEvent = new ModelCreatedEvent(mockEventManager as DashboardEventManager);
  });
  test('relays all publishes to manager', () => {
    mockEventManager.publishEvent = jest.fn();
    const first = {};
    const second = {};
    modelCreatedEvent.publish(first);
    modelCreatedEvent.publish(second);

    expect(mockEventManager.publishEvent).toHaveBeenCalledTimes(2);

    expect(mockEventManager.publishEvent).nthCalledWith(1, modelCreatedEvent.getKey(), first);

    expect(mockEventManager.publishEvent).nthCalledWith(2, modelCreatedEvent.getKey(), second);
  });

  test('gets observable from manager for this event', () => {
    mockEventManager.getObservableForEvent = jest.fn();

    modelCreatedEvent.getObservable();

    expect(mockEventManager.getObservableForEvent).toHaveBeenCalledWith(modelCreatedEvent.getKey());
  });
});
