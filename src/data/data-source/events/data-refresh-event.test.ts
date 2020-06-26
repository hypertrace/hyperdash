import { EMPTY, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { DashboardEventManager } from '../../../communication/dashboard-event-manager';
import { modelDestroyedEventKey } from '../../../model/events/model-destroyed-event';
import { ModelManager } from '../../../model/manager/model-manager';
import { PartialObjectMock } from '../../../test/partial-object-mock';
import { getTestScheduler } from '../../../test/rxjs-jest-test-scheduler';
import { DataRefreshEvent } from './data-refresh-event';

describe('Data refresh event', () => {
  let mockDashboardEventManager: PartialObjectMock<DashboardEventManager>;
  let mockModelManager: PartialObjectMock<ModelManager>;
  let testEventObservable: Observable<object>;
  let testDestroyObservable: Observable<object>;
  let dataRefreshEvent: DataRefreshEvent;

  const parent = {};
  const child = {};
  const orphan = {};
  const marbleValues = {
    p: parent,
    c: child,
    o: orphan
  };

  beforeEach(() => {
    testEventObservable = EMPTY;
    testDestroyObservable = EMPTY;
    mockModelManager = {};
    mockDashboardEventManager = {
      getObservableForEvent: jest.fn(eventKey => {
        if (eventKey === modelDestroyedEventKey) {
          return testDestroyObservable;
        }

        return testEventObservable.pipe(map(refreshedModel => ({ source: refreshedModel, data: undefined })));
      })
    };
    dataRefreshEvent = new DataRefreshEvent(
      mockDashboardEventManager as DashboardEventManager,
      mockModelManager as ModelManager
    );
  });

  test('gets observable which only notifies for refreshes in parent or self', () => {
    getTestScheduler().run(({ cold, expectObservable }) => {
      mockModelManager.isAncestor = jest.fn(
        (model: object, potentialAncestor: object) => model === child && potentialAncestor === parent
      );

      testEventObservable = cold('  poc', marbleValues);
      testDestroyObservable = cold('---poc', marbleValues);

      expectObservable(dataRefreshEvent.getObservableForModel(child)).toBe('x-x --|', { x: undefined });
      expectObservable(dataRefreshEvent.getObservableForModel(orphan)).toBe('-x- -|', { x: undefined });
      expectObservable(dataRefreshEvent.getObservableForModel(parent)).toBe('x-- |', { x: undefined });
    });
  });

  test('publishRefresh pass through calls publish', () => {
    dataRefreshEvent.publish = jest.fn();
    dataRefreshEvent.publishRefresh(parent);

    expect(dataRefreshEvent.publish).toHaveBeenCalledTimes(1);
    expect(dataRefreshEvent.publish).toHaveBeenCalledWith({ data: undefined, source: parent });
  });
});
