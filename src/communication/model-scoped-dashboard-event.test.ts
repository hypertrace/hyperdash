import { EMPTY, Observable } from 'rxjs';
import { modelDestroyedEventKey } from '../model/events/model-destroyed-event';
import { PartialObjectMock } from '../test/partial-object-mock';
import { getTestScheduler } from '../test/rxjs-jest-test-scheduler';
import { DashboardEventManager } from './dashboard-event-manager';
import { ModelScopedDashboardEvent, ModelScopedData } from './model-scoped-dashboard-event';

describe('Model scoped dashboard event', () => {
  let mockDashboardEventManager: PartialObjectMock<DashboardEventManager>;
  let mockModel: object;
  let testDestroyObservable: Observable<object>;
  let testEventObservable: Observable<ModelScopedData<string>>;
  let modelScopedDashboardEvent: ModelScopedDashboardEvent;

  beforeEach(() => {
    mockModel = {};
    testEventObservable = EMPTY;
    testDestroyObservable = EMPTY;

    mockDashboardEventManager = {
      publishEvent: jest.fn(),
      getObservableForEvent: jest.fn(eventKey => {
        if (eventKey === modelDestroyedEventKey) {
          return testDestroyObservable;
        }

        return testEventObservable;
      })
    };

    modelScopedDashboardEvent = new ModelScopedDashboardEvent(mockDashboardEventManager as DashboardEventManager);
  });

  test('provides observable for data scoped to a model, completing on model destruction', () => {
    getTestScheduler().run(({ cold, expectObservable }) => {
      testDestroyObservable = cold('---a', { a: mockModel });
      testEventObservable = cold('abc', {
        a: { source: mockModel, data: 'a value' },
        b: { source: mockModel, data: 'b value' },
        c: { source: {}, data: 'c value' }
      });

      expectObservable(modelScopedDashboardEvent.getObservableForModel(mockModel)).toBe('ab-|', {
        a: 'a value',
        b: 'b value'
      });
    });
  });
});
