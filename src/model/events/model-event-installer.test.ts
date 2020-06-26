import { CompletionObserver, EMPTY, ErrorObserver, NextObserver, Observable, PartialObserver, Subject } from 'rxjs';
import { DashboardEventManager } from '../../communication/dashboard-event-manager';
import { ModelScopedDashboardEvent } from '../../communication/model-scoped-dashboard-event';
import { PartialObjectMock } from '../../test/partial-object-mock';
import { getTestScheduler } from '../../test/rxjs-jest-test-scheduler';
import { Logger } from '../../util/logging/logger';
import { Model } from '../registration/model-decorators';
import { ModelDestroyedEvent } from './model-destroyed-event';
import {
  ModelEventInstaller,
  ModelEventMetadataType,
  ModelEventPublisher,
  ModelEventSubscriber
} from './model-event-installer';

describe('Model event installer', () => {
  class MockModelClass {
    public constructor(
      public readonly onEvent: () => void = jest.fn(),
      public event$: PartialObserver<unknown> | Observable<unknown> | undefined = new Subject()
    ) {}
  }
  let modelEventInstaller: ModelEventInstaller;
  let mockDashboardEventManager: PartialObjectMock<DashboardEventManager>;
  let mockModelDestroyedEvent: PartialObjectMock<ModelDestroyedEvent>;
  let mockLogger: PartialObjectMock<Logger>;
  let mockModel: MockModelClass;
  let eventObservable: Observable<unknown>;
  let destructionObservable: Observable<unknown>;

  const eventKey = Symbol('event key');
  beforeEach(() => {
    mockDashboardEventManager = {
      getObservableForEvent: jest.fn(requestedKey => (requestedKey === eventKey ? eventObservable : EMPTY)),
      publishEvent: jest.fn()
    };
    mockModelDestroyedEvent = {
      getDestructionObservable: jest.fn(() => destructionObservable)
    };
    mockLogger = {
      warn: jest.fn()
    };
    mockModel = new MockModelClass();

    modelEventInstaller = new ModelEventInstaller(
      mockDashboardEventManager as DashboardEventManager,
      mockModelDestroyedEvent as ModelDestroyedEvent,
      mockLogger as Logger
    );
  });

  test('should install subscriber on registered methods', () => {
    getTestScheduler().run(({ hot, flush }) => {
      modelEventInstaller.registerModelEvent(MockModelClass, 'onEvent', eventKey, ModelEventMetadataType.Subscriber);
      // Destroy before c should be passed along
      eventObservable = hot('      a-b-c');
      destructionObservable = hot('---(a|)');

      modelEventInstaller.decorate(mockModel);

      flush();

      expect(mockModel.onEvent).toHaveBeenCalledTimes(2);
      expect(mockModel.onEvent).nthCalledWith(1, 'a');
      expect(mockModel.onEvent).nthCalledWith(2, 'b');
    });
  });

  test('should install subscriber on registered properties', () => {
    getTestScheduler().run(({ hot, expectObservable }) => {
      modelEventInstaller.registerModelEvent(MockModelClass, 'event$', eventKey, ModelEventMetadataType.Subscriber);
      // Destroy before c should be passed along
      eventObservable = hot('      a-b-c');
      destructionObservable = hot('---(a|)');

      modelEventInstaller.decorate(mockModel);

      expectObservable(mockModel.event$ as Observable<string>).toBe('a-b|');
    });
  });

  test('should warn if subscriber property is not set', () => {
    getTestScheduler().run(({ hot, flush }) => {
      modelEventInstaller.registerModelEvent(MockModelClass, 'event$', eventKey, ModelEventMetadataType.Subscriber);

      eventObservable = hot('a');
      destructionObservable = hot('-a');

      mockModel.event$ = undefined;

      modelEventInstaller.decorate(mockModel);
      flush();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Cannot subscribe to property [event$] - must be function or Observer'
      );
    });
  });

  test('should warn if subscriber property is an object that is not a partial observer', () => {
    getTestScheduler().run(({ hot, flush }) => {
      modelEventInstaller.registerModelEvent(MockModelClass, 'event$', eventKey, ModelEventMetadataType.Subscriber);

      eventObservable = hot('a');
      destructionObservable = hot('-a');

      mockModel.event$ = ({} as unknown) as Subject<string>;

      modelEventInstaller.decorate(mockModel);
      flush();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Cannot subscribe to property [event$] - must be function or Observer'
      );
    });
  });

  test('should detect different flavors of observers', () => {
    getTestScheduler().run(({ hot, flush }) => {
      modelEventInstaller.registerModelEvent(MockModelClass, 'event$', eventKey, ModelEventMetadataType.Subscriber);

      // NextObserver
      eventObservable = hot('ab-c');
      destructionObservable = hot('--a');
      mockModel.event$ = {
        next: jest.fn()
      };

      modelEventInstaller.decorate(mockModel);
      flush();
      expect((mockModel.event$ as NextObserver<void>).next).toHaveBeenCalledTimes(2);
      expect((mockModel.event$ as NextObserver<void>).next).nthCalledWith(1, 'a');
      expect((mockModel.event$ as NextObserver<void>).next).nthCalledWith(2, 'b');

      // CompletionObserver
      eventObservable = hot('ab-|');
      destructionObservable = hot('--a');

      mockModel.event$ = {
        complete: jest.fn()
      };

      modelEventInstaller.decorate(mockModel);
      flush();
      expect((mockModel.event$ as CompletionObserver<void>).complete).toHaveBeenCalledTimes(1);

      // ErrorObserver
      eventObservable = hot('ab#|');
      destructionObservable = hot('--a');

      mockModel.event$ = {
        error: jest.fn()
      };

      modelEventInstaller.decorate(mockModel);
      flush();
      expect((mockModel.event$ as ErrorObserver<void>).error).toHaveBeenCalledTimes(1);
    });
  });

  test('should install publisher on registered properties', () => {
    getTestScheduler().run(({ hot, flush }) => {
      modelEventInstaller.registerModelEvent(MockModelClass, 'event$', eventKey, ModelEventMetadataType.Publisher);
      // Destroy before c should be passed along
      destructionObservable = hot('a');

      modelEventInstaller.decorate(mockModel);
      (mockModel.event$ as NextObserver<string>).next('a');
      (mockModel.event$ as NextObserver<string>).next('b');

      expect(mockDashboardEventManager.publishEvent).toHaveBeenCalledTimes(2);
      expect(mockDashboardEventManager.publishEvent).nthCalledWith(1, eventKey, 'a');
      expect(mockDashboardEventManager.publishEvent).nthCalledWith(2, eventKey, 'b');

      flush();
      // No more events should go through now that destruction is flushed

      (mockModel.event$ as NextObserver<string>).next('c');

      expect(mockDashboardEventManager.publishEvent).toHaveBeenCalledTimes(2);

      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });

  test('should warn if publisher is not an Observable', () => {
    modelEventInstaller.registerModelEvent(MockModelClass, 'event$', eventKey, ModelEventMetadataType.Publisher);
    mockModel.event$ = undefined;

    modelEventInstaller.decorate(mockModel);

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Cannot publish from property [event$] - must be an instanceof Observable'
    );
  });

  test('should support registering two subscribers on the same property', () => {
    getTestScheduler().run(({ hot, flush }) => {
      const secondEventKey = Symbol('second event');

      modelEventInstaller.registerModelEvent(MockModelClass, 'onEvent', eventKey, ModelEventMetadataType.Subscriber);
      modelEventInstaller.registerModelEvent(
        MockModelClass,
        'onEvent',
        secondEventKey,
        ModelEventMetadataType.Subscriber
      );

      mockDashboardEventManager.getObservableForEvent = jest.fn(providedEventKey => {
        if (providedEventKey === secondEventKey) {
          return hot('a-b-');
        }

        return hot('-x-y');
      });

      modelEventInstaller.decorate(mockModel);

      flush();

      expect(mockModel.onEvent).toHaveBeenCalledTimes(4);
      expect(mockModel.onEvent).nthCalledWith(1, 'a');
      expect(mockModel.onEvent).nthCalledWith(2, 'x');
      expect(mockModel.onEvent).nthCalledWith(3, 'b');
      expect(mockModel.onEvent).nthCalledWith(4, 'y');
    });
  });

  test('should support publishing and subscribing from the same property', () => {
    getTestScheduler().run(({ hot, expectObservable }) => {
      modelEventInstaller.registerModelEvent(MockModelClass, 'event$', eventKey, ModelEventMetadataType.Subscriber);
      modelEventInstaller.registerModelEvent(MockModelClass, 'event$', eventKey, ModelEventMetadataType.Publisher);
      eventObservable = hot('--xy');
      modelEventInstaller.decorate(mockModel);
      (mockModel.event$ as NextObserver<string>).next('a');
      (mockModel.event$ as NextObserver<string>).next('b');

      expect(mockDashboardEventManager.publishEvent).toHaveBeenCalledTimes(2);
      expect(mockDashboardEventManager.publishEvent).nthCalledWith(1, eventKey, 'a');
      expect(mockDashboardEventManager.publishEvent).nthCalledWith(2, eventKey, 'b');

      expectObservable(mockModel.event$ as Observable<string>).toBe('--xy');
    });
  });

  test('should support publishing with a resolved event key', () => {
    const secondEventKey = Symbol('second key');
    modelEventInstaller = new (class extends ModelEventInstaller {
      protected resolveEventKey: () => symbol = jest.fn().mockReturnValue(secondEventKey);
    })(
      mockDashboardEventManager as DashboardEventManager,
      mockModelDestroyedEvent as ModelDestroyedEvent,
      mockLogger as Logger
    );

    modelEventInstaller.registerModelEvent(MockModelClass, 'event$', eventKey, ModelEventMetadataType.Publisher);

    modelEventInstaller.decorate(mockModel);
    (mockModel.event$ as NextObserver<string>).next('z');

    expect(mockDashboardEventManager.publishEvent).toHaveBeenCalledTimes(1);
    expect(mockDashboardEventManager.publishEvent).nthCalledWith(1, secondEventKey, 'z');
  });

  test('should support subscribing with a resolved event key', () => {
    getTestScheduler().run(({ hot, expectObservable }) => {
      const secondEventKey = Symbol('second key');
      modelEventInstaller = new (class extends ModelEventInstaller {
        protected resolveEventKey: () => symbol = jest.fn().mockReturnValue(secondEventKey);
      })(
        mockDashboardEventManager as DashboardEventManager,
        mockModelDestroyedEvent as ModelDestroyedEvent,
        mockLogger as Logger
      );
      mockDashboardEventManager.getObservableForEvent = jest.fn(requestedKey =>
        requestedKey === secondEventKey ? hot('q') : hot('a')
      );

      modelEventInstaller.registerModelEvent(MockModelClass, 'event$', eventKey, ModelEventMetadataType.Subscriber);

      modelEventInstaller.decorate(mockModel);

      expectObservable(mockModel.event$ as Observable<string>).toBe('q');
    });
  });

  test('published events are given model context if a model scoped event', () => {
    const modelScopedEventKey = new ModelScopedDashboardEvent(mockDashboardEventManager as DashboardEventManager);

    modelEventInstaller.registerModelEvent(
      MockModelClass,
      'event$',
      modelScopedEventKey,
      ModelEventMetadataType.Publisher
    );

    modelEventInstaller.decorate(mockModel);
    (mockModel.event$ as NextObserver<string>).next('z');

    expect(mockDashboardEventManager.publishEvent).toHaveBeenCalledTimes(1);
    expect(mockDashboardEventManager.publishEvent).toBeCalledWith(modelScopedEventKey, {
      data: 'z',
      source: mockModel
    });
  });

  test('subscribed events are unwrapped from model context if a model scoped event', () => {
    getTestScheduler().run(({ hot, expectObservable }) => {
      const modelScopedEventKey = new ModelScopedDashboardEvent(mockDashboardEventManager as DashboardEventManager);
      modelEventInstaller.registerModelEvent(
        MockModelClass,
        'event$',
        modelScopedEventKey,
        ModelEventMetadataType.Subscriber
      );

      mockDashboardEventManager.getObservableForEvent = jest.fn(requestedKey => {
        if (requestedKey === modelScopedEventKey) {
          return hot('a', { a: { data: 'foo', source: mockModel } });
        }

        return hot('');
      });
      modelEventInstaller.decorate(mockModel);

      expectObservable(mockModel.event$ as Observable<string>).toBe('a', { a: 'foo' });
    });
  });

  test('can register event subscribers and publishers from decorators', () => {
    // tslint:disable-next-line: max-classes-per-file
    @Model({
      type: 'test-event-decorators'
    })
    class TestEventDecoratorsClass {
      @ModelEventSubscriber(eventKey)
      public onEvent: () => void = jest.fn();

      @ModelEventPublisher(eventKey)
      public event$: Subject<string> = new Subject();
    }

    getTestScheduler().run(({ cold, flush }) => {
      eventObservable = cold('a');
      const model = new TestEventDecoratorsClass();
      modelEventInstaller.decorate(model);

      flush();
      expect(model.onEvent).toHaveBeenCalledTimes(1);
      expect(model.onEvent).toHaveBeenCalledWith('a');

      model.event$.next('foo');
      expect(mockDashboardEventManager.publishEvent).toHaveBeenCalledTimes(1);
      expect(mockDashboardEventManager.publishEvent).toHaveBeenCalledWith(eventKey, 'foo');
    });
  });
});
