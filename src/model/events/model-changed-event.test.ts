import { EMPTY, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { DashboardEventManager } from '../../communication/dashboard-event-manager';
import { PartialObjectMock } from '../../test/partial-object-mock';
import { getTestScheduler } from '../../test/rxjs-jest-test-scheduler';
import { ModelManager } from '../manager/model-manager';
import { ModelChangedEvent } from './model-changed-event';
import { modelDestroyedEventKey } from './model-destroyed-event';

describe('Model changed event', () => {
  let mockDashboardEventManager: PartialObjectMock<DashboardEventManager>;
  let mockModelManager: PartialObjectMock<ModelManager>;
  let testEventObservable: Observable<object>;
  let testDestroyObservable: Observable<object>;
  let modelChangedEvent: ModelChangedEvent;

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

        return testEventObservable.pipe(map(changedModel => ({ source: changedModel, data: changedModel })));
      })
    };
    modelChangedEvent = new ModelChangedEvent(
      mockDashboardEventManager as DashboardEventManager,
      mockModelManager as ModelManager
    );
  });

  test('gets observable which only notifies for changes in children or self', () => {
    getTestScheduler().run(({ cold, expectObservable }) => {
      mockModelManager.isAncestor = jest.fn(
        (model: object, potentialAncestor: object) => model === child && potentialAncestor === parent
      );

      testEventObservable = cold('  poc', marbleValues);
      testDestroyObservable = cold('---poc', marbleValues);

      expectObservable(modelChangedEvent.getObservableForModel(child)).toBe('--c --|', marbleValues);
      expectObservable(modelChangedEvent.getObservableForModel(orphan)).toBe('-o- -|', marbleValues);
      expectObservable(modelChangedEvent.getObservableForModel(parent)).toBe('p-c |', marbleValues);
    });
  });

  test('publishChange pass through calls publish', () => {
    modelChangedEvent.publish = jest.fn();
    modelChangedEvent.publishChange(parent);

    expect(modelChangedEvent.publish).toHaveBeenCalledTimes(1);
    expect(modelChangedEvent.publish).toHaveBeenCalledWith({ data: parent, source: parent });
  });
});
