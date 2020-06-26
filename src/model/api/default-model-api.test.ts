import { EMPTY } from 'rxjs';
import { DataSource } from '../../data/data-source/data-source';
import { DataSourceManager } from '../../data/data-source/manager/data-source-manager';
import { TimeRangeManager } from '../../data/time-range/manager/time-range-manager';
import { DeserializationManager } from '../../persistence/deserialization/deserialization-manager';
import { JsonPrimitive } from '../../persistence/model-json';
import { PartialObjectMock } from '../../test/partial-object-mock';
import { getTestScheduler } from '../../test/rxjs-jest-test-scheduler';
import { ThemeManager } from '../../theming/theme-manager';
import { Logger } from '../../util/logging/logger';
import { VariableManager } from '../../variable/manager/variable-manager';
import { ModelChangedEvent } from '../events/model-changed-event';
import { ModelDestroyedEvent } from '../events/model-destroyed-event';
import { ModelManager } from '../manager/model-manager';
import { PropertyLocation } from '../property/property-location';
import { DefaultModelApi } from './default-model-api';

describe('Default Model API', () => {
  let defaultModelApi: DefaultModelApi;
  let model: { [key: string]: JsonPrimitive };
  let mockModelManager: PartialObjectMock<ModelManager>;
  let mockDataSourceManager: PartialObjectMock<DataSourceManager>;
  let mockLogger: PartialObjectMock<Logger>;
  let mockModelChangeEvent: PartialObjectMock<ModelChangedEvent>;
  let mockModelDestroyedEvent: PartialObjectMock<ModelDestroyedEvent>;
  let mockThemeManager: PartialObjectMock<ThemeManager>;
  let mockVariableManager: PartialObjectMock<VariableManager>;
  let mockDeserializationManager: PartialObjectMock<DeserializationManager>;
  let mockTimeRangeManager: PartialObjectMock<TimeRangeManager>;

  const buildApi = () => {
    defaultModelApi = new DefaultModelApi(
      model,
      mockLogger as Logger,
      mockModelManager as ModelManager,
      mockDataSourceManager as DataSourceManager,
      mockModelChangeEvent as ModelChangedEvent,
      mockModelDestroyedEvent as ModelDestroyedEvent,
      mockThemeManager as ThemeManager,
      mockVariableManager as VariableManager,
      mockDeserializationManager as DeserializationManager,
      mockTimeRangeManager as TimeRangeManager
    );
  };

  beforeEach(() => {
    model = {};
    mockModelManager = {
      create: jest.fn(),
      destroy: jest.fn()
    };
    mockLogger = {};

    mockDataSourceManager = {
      attach: jest.fn()
    };

    mockModelChangeEvent = {
      getObservableForModel: () => EMPTY
    };
    mockModelDestroyedEvent = {
      getDestructionObservable: () => EMPTY
    };

    mockThemeManager = {
      getThemeForModel: jest.fn()
    };

    mockVariableManager = {
      set: jest.fn()
    };
    mockDeserializationManager = {
      deserialize: jest.fn()
    };
    mockTimeRangeManager = {};
    buildApi();
  });

  test('should support creating a child', () => {
    const childClass = class ChildClass {};
    defaultModelApi.createChild(childClass);

    expect(mockModelManager.create).toHaveBeenCalledWith(childClass, model);

    const mockParent = {};
    defaultModelApi.createChild(childClass, mockParent);

    expect(mockModelManager.create).toHaveBeenCalledWith(childClass, mockParent);
  });

  test('should support destroying a child', () => {
    const child = {};
    defaultModelApi.destroyChild(child);
    expect(mockModelManager.destroy).toHaveBeenCalledWith(child);
  });

  test('get data invokes getData function of discovered data source for model', () => {
    const returnVal = {};
    const mockDataSource = {
      getData: jest.fn().mockReturnValue(returnVal)
    };
    mockDataSourceManager.getClosest = jest.fn().mockReturnValue(mockDataSource);

    expect(defaultModelApi.getData()).toBe(returnVal);
  });

  test('get data logs and returns empty observable if no data source found', () => {
    mockDataSourceManager.getClosest = jest.fn().mockReturnValue(undefined);

    mockLogger.warn = jest.fn();

    expect(defaultModelApi.getData()).toEqual(EMPTY);
    expect(mockLogger.warn).toHaveBeenCalledWith('No data source found when trying to retrieve data for model');
  });

  test('should provide lifecycle observables that clean up after themselves', () => {
    getTestScheduler().run(({ cold, expectObservable }) => {
      const marbleValues = { a: model, b: {} };
      const modelChanges = cold('a-aa-|', marbleValues);
      const modelDestroy = cold('-----(a|)', { a: undefined });
      mockModelChangeEvent = {
        getObservableForModel: () => modelChanges
      };
      mockModelDestroyedEvent = {
        getDestructionObservable: () => modelDestroy
      };

      buildApi();

      expectObservable(defaultModelApi.change$).toBe('a-aa-|', { a: undefined });
      expectObservable(defaultModelApi.destroyed$).toBe('-----(a|)', { a: undefined });
    });
  });

  test('supports theme lookup', () => {
    const mockTheme = {};
    mockThemeManager.getThemeForModel = jest.fn().mockReturnValue(mockTheme);
    expect(defaultModelApi.getTheme()).toBe(mockTheme);
    expect(mockThemeManager.getThemeForModel).toHaveBeenCalledWith(model);
  });

  test('supports setting variables for self by default', () => {
    defaultModelApi.setVariable('key', 'value');
    expect(mockVariableManager.set).toHaveBeenCalledWith('key', 'value', model);
  });

  test('supports setting variables for child models', () => {
    const child = {};
    defaultModelApi.setVariable('key', 'value', child);
    expect(mockVariableManager.set).toHaveBeenCalledWith('key', 'value', child);
  });

  test('supports deserializing JSON as a child model', () => {
    const modelJson = { type: 'model' };
    const expectedResult = {};
    const deserializationMock = jest.fn().mockReturnValue(expectedResult);

    mockDeserializationManager.deserialize = deserializationMock;

    expect(defaultModelApi.createChild<object>(modelJson)).toBe(expectedResult);

    expect(deserializationMock).toHaveBeenCalledWith(modelJson, expect.any(PropertyLocation));
    expect((deserializationMock.mock.calls[0][1] as PropertyLocation).parentModel).toBe(model);
  });

  test('supports setting data source', () => {
    const mockDataSource: PartialObjectMock<DataSource<unknown>> = {};
    const child = {};
    defaultModelApi.setDataSource(mockDataSource as DataSource<unknown>, child);

    expect(mockDataSourceManager.attach).toHaveBeenLastCalledWith(mockDataSource, child);

    defaultModelApi.setDataSource(mockDataSource as DataSource<unknown>);

    expect(mockDataSourceManager.attach).toHaveBeenLastCalledWith(mockDataSource, model);
  });

  test('supports getting time range', () => {
    const mockTimeRange = {};
    const mockGetTimeRange = jest.fn().mockReturnValue(mockTimeRange);
    mockTimeRangeManager.getClosest = mockGetTimeRange;

    expect(defaultModelApi.getTimeRange()).toBe(mockTimeRange);
    expect(mockGetTimeRange).toHaveBeenCalledWith(model);
  });
});
