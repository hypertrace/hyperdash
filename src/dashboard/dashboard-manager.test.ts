// tslint:disable: completed-docs
import { EMPTY, Observable } from 'rxjs';
import { DataSource, dataSourceMarker } from '../data/data-source/data-source';
import { DataRefreshEvent } from '../data/data-source/events/data-refresh-event';
import { DataSourceManager } from '../data/data-source/manager/data-source-manager';
import { TimeRangeManager } from '../data/time-range/manager/time-range-manager';
import { ModelManager } from '../model/manager/model-manager';
import { DeserializationManager } from '../persistence/deserialization/deserialization-manager';
import { SerializationManager } from '../persistence/serialization/serialization-manager';
import { PartialObjectMock } from '../test/partial-object-mock';
import { VariableManager } from '../variable/manager/variable-manager';
import { DashboardManager } from './dashboard-manager';

describe('Dashboard manager', () => {
  let dashboardManager: DashboardManager;
  let mockDeserializationManager: PartialObjectMock<DeserializationManager>;
  let mockModelManager: PartialObjectMock<ModelManager>;
  let mockVariableManager: PartialObjectMock<VariableManager>;
  let mockSerializationManager: PartialObjectMock<SerializationManager>;
  let mockDataSourceManager: PartialObjectMock<DataSourceManager>;
  let mockRefreshEvent: PartialObjectMock<DataRefreshEvent>;
  let mockTimeRangeManager: PartialObjectMock<TimeRangeManager>;
  let mockRoot: object;

  beforeEach(() => {
    mockRoot = {};

    mockDeserializationManager = {
      deserialize: jest.fn().mockReturnValue(mockRoot)
    };
    mockModelManager = {
      destroy: jest.fn(),
      create: jest.fn()
    };
    mockVariableManager = {
      set: jest.fn()
    };
    mockDataSourceManager = {
      setRootDataSource: jest.fn(),
      getRootDataSource: jest.fn()
    };

    mockSerializationManager = {};

    mockRefreshEvent = {
      publishRefresh: jest.fn()
    };

    mockTimeRangeManager = {
      setRootTimeRange: jest.fn()
    };

    dashboardManager = new DashboardManager(
      mockDeserializationManager as DeserializationManager,
      mockModelManager as ModelManager,
      mockVariableManager as VariableManager,
      mockSerializationManager as SerializationManager,
      mockDataSourceManager as DataSourceManager,
      mockRefreshEvent as DataRefreshEvent,
      mockTimeRangeManager as TimeRangeManager
    );
  });

  test('can create dashboards', () => {
    dashboardManager.create({
      type: 'serialized-model'
    });

    expect(mockDeserializationManager.deserialize).toHaveBeenCalledWith({
      type: 'serialized-model'
    });
  });

  test('can destroy dashboards', () => {
    const dashboard = dashboardManager.create({
      type: 'serialized-model'
    });

    dashboard.destroy();
    expect(mockModelManager.destroy).toHaveBeenCalledWith(dashboard.root);
  });

  test('can set variables in a dashboard', () => {
    const dashboard = dashboardManager.create({
      type: 'serialized-model'
    });

    dashboard.setVariable('key', 'value');

    expect(mockVariableManager.set).toHaveBeenCalledWith('key', 'value', dashboard.root);
  });

  test('can serialize dashboards', () => {
    const serializedResult = {};
    mockSerializationManager.serialize = jest.fn().mockReturnValue(serializedResult);
    const dashboard = dashboardManager.create({
      type: 'serialized-model'
    });

    expect(dashboard.serialize()).toBe(serializedResult);

    expect(mockSerializationManager.serialize).toHaveBeenCalledWith(dashboard.root);
  });

  test('can create dashboards and set a root data source by class', () => {
    const deserializedRoot = {};
    mockDeserializationManager.deserialize = jest.fn().mockReturnValue(deserializedRoot);

    const testDataSourceClass = class implements DataSource<never> {
      public dataSourceMarker: typeof dataSourceMarker = dataSourceMarker;
      public getData(): Observable<never> {
        return EMPTY;
      }
    };
    mockModelManager.create = jest.fn(() => new testDataSourceClass());

    dashboardManager.create({ type: 'serialized-model' }).createAndSetRootDataFromModelClass(testDataSourceClass);

    expect(mockModelManager.create).toHaveBeenCalledWith(testDataSourceClass, deserializedRoot);

    expect(mockDataSourceManager.setRootDataSource).toHaveBeenCalledWith(
      expect.any(testDataSourceClass),
      deserializedRoot
    );
  });

  test('can publish refresh events', () => {
    const dashboard = dashboardManager.create({
      type: 'serialized-model'
    });

    dashboard.refresh();

    expect(mockRefreshEvent.publishRefresh).toHaveBeenCalledWith(dashboard.root);
  });

  test('can change root time range', () => {
    const dashboard = dashboardManager.create({
      type: 'serialized-model'
    });

    const timeRange = { startTime: new Date(), endTime: new Date() };

    dashboard.setTimeRange(timeRange);

    expect(mockTimeRangeManager.setRootTimeRange).toHaveBeenCalledWith(dashboard.root, timeRange);
  });

  test('can retrieve root data source', () => {
    const dashboard = dashboardManager.create({
      type: 'serialized-model'
    });

    const mockDataSource = {};

    mockDataSourceManager.getRootDataSource = jest.fn().mockReturnValue(mockDataSource);

    expect(dashboard.getRootDataSource()).toBe(mockDataSource);

    expect(mockDataSourceManager.getRootDataSource).toHaveBeenCalledWith(dashboard.root);
  });

  test('destroys previous root data source when assigning a new one', () => {
    const dashboard = dashboardManager.create({
      type: 'serialized-model'
    });

    const mockOriginalDataSource = {};
    const mockNewDataSource = {};

    mockDataSourceManager.getRootDataSource = jest.fn().mockReturnValue(mockOriginalDataSource);

    dashboard.setRootDataSource(mockNewDataSource as DataSource<never>);

    expect(mockModelManager.destroy).toHaveBeenCalledWith(mockOriginalDataSource);
    expect(mockDataSourceManager.setRootDataSource).toHaveBeenCalledWith(mockNewDataSource, dashboard.root);
  });
});
