import { EMPTY, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { DashboardEventManager } from '../../../communication/dashboard-event-manager';
import { modelDestroyedEventKey } from '../../../model/events/model-destroyed-event';
import { ModelManager } from '../../../model/manager/model-manager';
import { PartialObjectMock } from '../../../test/partial-object-mock';
import { getTestScheduler } from '../../../test/rxjs-jest-test-scheduler';
import { TimeRange } from '../time-range';
import { TimeRangeChangedEvent } from './time-range-changed-event';

describe('Time range changed event', () => {
  let mockDashboardEventManager: PartialObjectMock<DashboardEventManager>;
  let mockModelManager: PartialObjectMock<ModelManager>;
  let testTimeRangeChangeInfoObservable: Observable<[object, TimeRange]>;
  let testDestroyObservable: Observable<object>;
  let timeRangeChange: TimeRangeChangedEvent;
  const firstTimeRange = { startTime: new Date(), endTime: new Date() };
  const secondTimeRange = { ...firstTimeRange };

  const parent = {};
  const child = {};
  const orphan = {};

  beforeEach(() => {
    testTimeRangeChangeInfoObservable = EMPTY;
    testDestroyObservable = EMPTY;
    mockModelManager = {};
    mockDashboardEventManager = {
      getObservableForEvent: jest.fn(eventKey => {
        if (eventKey === modelDestroyedEventKey) {
          return testDestroyObservable;
        }

        return testTimeRangeChangeInfoObservable.pipe(
          map(([model, timeRange]) => ({ source: model, data: timeRange }))
        );
      })
    };
    timeRangeChange = new TimeRangeChangedEvent(
      mockDashboardEventManager as DashboardEventManager,
      mockModelManager as ModelManager
    );
  });

  test('gets observable which only notifies for time ranges in parent or self', () => {
    getTestScheduler().run(({ cold, expectObservable }) => {
      mockModelManager.isAncestor = jest.fn(
        (model: object, potentialAncestor: object) => model === child && potentialAncestor === parent
      );

      testTimeRangeChangeInfoObservable = cold<[object, TimeRange]>('abcd', {
        a: [parent, firstTimeRange],
        b: [child, secondTimeRange],
        c: [parent, firstTimeRange],
        d: [orphan, secondTimeRange]
      });
      testDestroyObservable = cold('----poc', {
        p: parent,
        c: child,
        o: orphan
      });

      const timeRangeMarbles = { f: firstTimeRange, s: secondTimeRange };
      expectObservable(timeRangeChange.getObservableForModel(child)).toBe('fsf- --|', timeRangeMarbles);
      expectObservable(timeRangeChange.getObservableForModel(orphan)).toBe('---s -|', timeRangeMarbles);
      expectObservable(timeRangeChange.getObservableForModel(parent)).toBe('f-f- |', timeRangeMarbles);
    });
  });

  test('publishTimeRangeChange pass through calls publish', () => {
    timeRangeChange.publish = jest.fn();
    timeRangeChange.publishTimeRangeChange(parent, firstTimeRange);

    expect(timeRangeChange.publish).toHaveBeenCalledTimes(1);
    expect(timeRangeChange.publish).toHaveBeenCalledWith({ data: firstTimeRange, source: parent });
  });
});
