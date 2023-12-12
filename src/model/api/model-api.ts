import { Observable } from 'rxjs';
import { DataSource } from '../../data/data-source/data-source';
import { TimeRange } from '../../data/time-range/time-range';
import { ModelJson } from '../../persistence/model-json';
import { MergedTheme, Theme } from '../../theming/theme';
import { Constructable } from '../../util/constructable';

/**
 * Interface for models to interact with their ecosystem in
 * a limited way.
 */
export interface ModelApi {
  /**
   * Instantiates the provided model constructor or JSON, adding it to the model tree
   * as a child of the provided parent model. Parent defaults to current model if not specified.
   */
  createChild<T extends object>(child: Constructable<T> | ModelJson, parentModel?: object): T;

  /**
   * Removes child model from the model tree.
   */
  destroyChild(child: object): void;

  /**
   * Retrieves closest data source as specified by searching along the model tree by the below argorithm,
   * then retrieves its data returning as an observable. If the data source is not defined,
   * instead we return an empty observable.
   *
   *   The data returned is specified by
   *   - If this model has a data source registered to it, retrieve from that data source
   *   - If this model is a data source, recurse to grandparent (that is, the parent of the model the data source is
   *     attached to)
   *   - Else, recurse upwards to parent
   */
  getData<T, R = unknown>(request?: R): Observable<T>;

  /**
   * Retrieves the merged theme specified for this model
   */
  getTheme<T extends Theme>(): MergedTheme<T>;

  /**
   * Sets a variable value to the provided key. The variable is scoped to the provided model, or the
   * current model if no scope is provided.
   */
  setVariable(variableKey: string, value: unknown, modelScope?: object): void;

  /**
   * Sets a data source for the provided model. Defaults to the current model if not provided.
   */
  setDataSource(value: DataSource<unknown>, modelScope?: object): void;

  /**
   * Gets the time range associated with the provided model, or its closest parent with a time range.
   * If no time range is available, returns undefined.
   */
  getTimeRange(): TimeRange | undefined;

  /**
   * An observable which is notified when this model, or a child of this model is changed.
   * It will be completed when the model is destroyed, and generally should not require
   * manually unsubscribing.
   */
  readonly change$: Observable<void>;

  /**
   * An observable which is notified when this model is destroyed, completing immediately after.
   * It generally should not require manually unsubscribing.
   */
  readonly destroyed$: Observable<void>;
}
