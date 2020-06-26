import { EMPTY } from 'rxjs';
import { ModelManager } from '../../../model/manager/model-manager';
import { DataSource, dataSourceMarker } from '../data-source';
import { DataSourceManager } from './data-source-manager';

describe('Data source manager', () => {
  let dataSourceManager: DataSourceManager;
  let mockModelManager: Partial<ModelManager>;

  const mockModel = {};
  const mockRoot = {};
  const mockDataSource: Partial<DataSource<unknown>> = {};

  beforeEach(() => {
    mockModelManager = {
      getRoot: jest.fn(() => mockRoot)
    };

    dataSourceManager = new DataSourceManager(mockModelManager as ModelManager);
  });

  test('supports attaching a data source', () => {
    dataSourceManager.attach(mockDataSource as DataSource<unknown>, mockModel);

    expect(dataSourceManager.get(mockModel)).toBe(mockDataSource);
  });

  test('attaching a data source overwrites a previous data source', () => {
    const secondDataSource = {};
    dataSourceManager.attach(mockDataSource as DataSource<unknown>, mockModel);
    dataSourceManager.attach(secondDataSource as DataSource<unknown>, mockModel);

    expect(dataSourceManager.get(mockModel)).toBe(secondDataSource);
  });

  test('supports detaching a data source', () => {
    dataSourceManager.attach(mockDataSource as DataSource<unknown>, mockModel);
    dataSourceManager.detach(mockModel);

    expect(dataSourceManager.get(mockModel)).toBeUndefined();
  });

  test('detaching a data source succeeds even if no data source was registered', () => {
    dataSourceManager.detach(mockModel);
  });

  test('isDataSource can distinguish between data sources and other models', () => {
    expect(dataSourceManager.isDataSource(mockDataSource)).toBeFalsy();
    expect(dataSourceManager.isDataSource({ getData: () => EMPTY })).toBeFalsy();
    // tslint:disable-next-line:no-any
    expect(dataSourceManager.isDataSource({ dataSourceMarker: Symbol('test other symbol') } as any)).toBeFalsy();
    expect(dataSourceManager.isDataSource({ dataSourceMarker: dataSourceMarker })).toBeFalsy();

    expect(dataSourceManager.isDataSource({ getData: () => EMPTY, dataSourceMarker: dataSourceMarker })).toBeTruthy();
  });

  test('modelJsonHasData can correctly identify json containing data', () => {
    expect(dataSourceManager.modelJsonHasData({ type: 'any' })).toBeFalsy();
    expect(dataSourceManager.modelJsonHasData({ type: 'any', data: 'any' })).toBeFalsy();
    // tslint:disable-next-line:no-null-keyword
    expect(dataSourceManager.modelJsonHasData({ type: 'any', data: null })).toBeFalsy();
    expect(dataSourceManager.modelJsonHasData({ type: 'any', data: {} })).toBeTruthy();
  });

  test('creates property location including getter and setter', () => {
    spyOn(dataSourceManager, 'attach').and.callThrough();
    spyOn(dataSourceManager, 'detach').and.callThrough();

    const location = dataSourceManager.getPropertyLocationForData(mockModel);

    expect(location.toString()).toBe('data');

    location.setProperty(mockDataSource as DataSource<unknown>);
    expect(dataSourceManager.attach).toHaveBeenCalledWith(mockDataSource, mockModel);

    expect(location.getProperty()).toBe(mockDataSource);

    location.setProperty(undefined);
    expect(dataSourceManager.detach).toHaveBeenCalledWith(mockModel);

    expect(location.getProperty()).toBeUndefined();
  });

  test('getClosest returns closest data source for model', () => {
    const mockParentDataSource: Partial<DataSource<unknown>> = {};

    mockModelManager.getParent = jest.fn((providedModel: object) =>
      providedModel === mockModel ? mockRoot : undefined
    );

    dataSourceManager.attach(mockDataSource as DataSource<unknown>, mockModel);

    expect(dataSourceManager.getClosest(mockModel)).toBe(mockDataSource);
    expect(dataSourceManager.getClosest(mockRoot)).toBeUndefined();

    dataSourceManager.attach(mockParentDataSource as DataSource<unknown>, mockRoot);

    expect(dataSourceManager.getClosest(mockModel)).toBe(mockDataSource);
    expect(dataSourceManager.getClosest(mockRoot)).toBe(mockParentDataSource);

    dataSourceManager.detach(mockModel);

    expect(dataSourceManager.getClosest(mockModel)).toBe(mockParentDataSource);
    expect(dataSourceManager.getClosest(mockRoot)).toBe(mockParentDataSource);

    dataSourceManager.detach(mockRoot);

    expect(dataSourceManager.getClosest(mockModel)).toBeUndefined();
    expect(dataSourceManager.getClosest(mockRoot)).toBeUndefined();
  });

  test('getClosest skips parent for data source model', () => {
    const mockParentDataSource: Partial<DataSource<unknown>> = {};

    mockModelManager.getParent = jest.fn((providedModel: object) => {
      if (providedModel === mockDataSource) {
        return mockModel;
      }
      if (providedModel === mockModel) {
        return mockRoot;
      }
      if (providedModel === mockParentDataSource) {
        return mockRoot;
      }

      return undefined;
    });

    dataSourceManager.isDataSource = jest.fn(
      model => model === mockDataSource || model === mockParentDataSource
      // tslint:disable-next-line: no-any
    ) as any;

    dataSourceManager.attach(mockDataSource as DataSource<unknown>, mockModel);
    dataSourceManager.attach(mockParentDataSource as DataSource<unknown>, mockRoot);

    expect(dataSourceManager.getClosest(mockDataSource)).toBe(mockParentDataSource);

    expect(dataSourceManager.getClosest(mockParentDataSource)).toBeUndefined();
  });

  test('getClosest treats root data sources as root of resolution tree', () => {
    const mockRootDataSource: Partial<DataSource<unknown>> = {};
    mockModelManager.getParent = jest.fn((providedModel: object) => {
      if (providedModel === mockDataSource) {
        return mockRoot;
      }
      if (providedModel === mockModel) {
        return mockRoot;
      }
      if (providedModel === mockRootDataSource) {
        return mockRoot;
      }

      return undefined;
    });

    mockModelManager.getRoot = jest.fn(() => mockRoot);

    dataSourceManager.isDataSource = jest.fn(
      model => model === mockDataSource || model === mockRootDataSource
      // tslint:disable-next-line: no-any
    ) as any;

    dataSourceManager.setRootDataSource(mockRootDataSource as DataSource<unknown>, mockRoot);
    dataSourceManager.attach(mockDataSource as DataSource<unknown>, mockRoot);

    expect(dataSourceManager.getClosest(mockModel)).toBe(mockDataSource);
    expect(dataSourceManager.getClosest(mockRoot)).toBe(mockDataSource);
    expect(dataSourceManager.getClosest(mockDataSource)).toBe(mockRootDataSource);
    expect(dataSourceManager.getClosest(mockModel)).toBe(mockDataSource);
    expect(dataSourceManager.getClosest(mockRootDataSource)).toBeUndefined();

    dataSourceManager.detach(mockRoot);
    expect(dataSourceManager.getClosest(mockModel)).toBe(mockRootDataSource);
    expect(dataSourceManager.getClosest(mockModel)).toBe(mockRootDataSource);
  });
});
