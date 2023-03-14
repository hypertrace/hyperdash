import { DataSource } from '../data/data-source/data-source';
import { DataRefreshEvent } from '../data/data-source/events/data-refresh-event';
import { DataSourceManager } from '../data/data-source/manager/data-source-manager';
import { TimeRangeManager } from '../data/time-range/manager/time-range-manager';
import { TimeRange } from '../data/time-range/time-range';
import { ModelManager } from '../model/manager/model-manager';
import { SerializationManager } from '../persistence/serialization/serialization-manager';
import { Constructable } from '../util/constructable';
import { VariableManager } from '../variable/manager/variable-manager';
import { Dashboard } from './dashboard';

// tslint:disable-next-line: completed-docs
export class DefaultDashboard<TRoot extends object> implements Dashboard<TRoot> {
  public constructor(
    public readonly root: TRoot,
    private readonly variableManager: VariableManager,
    private readonly timeRangeManager: TimeRangeManager,
    private readonly serializationManager: SerializationManager,
    private readonly modelManager: ModelManager,
    private readonly dataRefreshEvent: DataRefreshEvent,
    private readonly dataSourceManager: DataSourceManager
  ) {}

  /**
   * @inheritdoc
   */
  public setVariable(variableName: string, value: unknown): this {
    this.variableManager.set(variableName, value, this.root);

    return this;
  }

  /**
   * @inheritdoc
   */
  public setTimeRange(timeRange: TimeRange): this {
    this.timeRangeManager.setRootTimeRange(this.root, timeRange);

    return this;
  }

  /**
   * @inheritdoc
   */
  public serialize(): object {
    return this.serializationManager.serialize(this.root);
  }

  /**
   * @inheritdoc
   */
  public destroy(): void {
    this.modelManager.destroy(this.root);
  }

  /**
   * @inheritdoc
   */
  public refresh(): this {
    this.dataRefreshEvent.publishRefresh(this.root);

    return this;
  }

  /**
   * @inheritdoc
   */
  public setRootDataSource<T>(rootDataSource: DataSource<T>): this {
    this.modelManager.destroy(this.getRootDataSource());
    this.dataSourceManager.setRootDataSource(rootDataSource, this.root);

    return this;
  }

  /**
   * @inheritdoc
   */
  public createAndSetRootDataFromModelClass<T>(dataSourceModelClass: Constructable<DataSource<T>>): this {
    return this.setRootDataSource(this.modelManager.create(dataSourceModelClass, this.root));
  }

  /**
   * @inheritdoc
   */
  // tslint:disable-next-line: no-any
  public getRootDataSource<T extends DataSource<any>>(): T | undefined {
    return this.dataSourceManager.getRootDataSource(this.root) as T | undefined;
  }

  /**
   * @inheritdoc
   */
  public getModelInstances<T extends object>(modelClass: Constructable<T>): object[] {
    return this.modelManager.getModelInstances<T>(modelClass);
  }
}
