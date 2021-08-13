import { DataSource } from '../data/data-source/data-source';
import { TimeRange } from '../data/time-range/time-range';
import { Constructable } from '../util/constructable';

/**
 * Represents an instantiated dashboard
 */

// Want any data source to be assignable here, caller should be more specific

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Dashboard<TRoot extends object = object> {
  /**
   * The root model of the dashboard
   */
  readonly root: TRoot;

  /**
   * Sets a variable scoped to the entire dashboard (the root)
   */
  setVariable(variableName: string, value: unknown): this;

  /**
   * Sets root time range for entire dashboard
   */
  setTimeRange(timeRange: TimeRange): this;

  /**
   * Returns a serialized from of this dashboard. Note this does not
   * affect the dashboard in any way, it must be explicitly destroyed
   * if it is no longer in use.
   */
  serialize(): object;

  /**
   * Destroys the dashboard, removing internal references from memory
   */
  destroy(): void;

  /**
   * Refreshes the dashboard, broadcasting an event indicating data should be refetched
   */
  refresh(): this;

  /**
   * Sets the root data source of the dashboard
   */
  setRootDataSource<T>(dataSource: DataSource<T>): this;

  /**
   * Creates the provided model class and sets it as the root data source of the dashboard. The
   * model will be attached to the model tree as a child of root, and will be destroyed when
   * the root is destroyed.
   */
  createAndSetRootDataFromModelClass<T>(dataSourceModelClass: Constructable<DataSource<T>>): this;

  /**
   * Returns the root data source of the dashboard, if set
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getRootDataSource<T extends DataSource<any>>(): T | undefined;
}
