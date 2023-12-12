import { EMPTY, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { DataSource } from '../../data/data-source/data-source';
import { DataSourceManager } from '../../data/data-source/manager/data-source-manager';
import { TimeRangeManager } from '../../data/time-range/manager/time-range-manager';
import { TimeRange } from '../../data/time-range/time-range';
import { DeserializationManager } from '../../persistence/deserialization/deserialization-manager';
import { ModelJson } from '../../persistence/model-json';
import { MergedTheme, Theme } from '../../theming/theme';
import { ThemeManager } from '../../theming/theme-manager';
import { Constructable } from '../../util/constructable';
import { Logger } from '../../util/logging/logger';
import { VariableManager } from '../../variable/manager/variable-manager';
import { ModelChangedEvent } from '../events/model-changed-event';
import { ModelDestroyedEvent } from '../events/model-destroyed-event';
import { ModelManager } from '../manager/model-manager';
import { PropertyLocation } from '../property/property-location';
import { ModelApi } from './model-api';

/**
 * Default implementation of Model API
 */
export class DefaultModelApi implements ModelApi {
  public constructor(
    private readonly model: object,
    private readonly logger: Logger,
    private readonly modelManager: ModelManager,
    private readonly dataSourceManager: DataSourceManager,
    private readonly modelChangedEvent: ModelChangedEvent,
    private readonly modelDestroyedEvent: ModelDestroyedEvent,
    private readonly themeManager: ThemeManager,
    private readonly variableManager: VariableManager,
    private readonly deserializationManager: DeserializationManager,
    private readonly timeRangeManager: TimeRangeManager
  ) {
    this.destroyed$ = this.modelDestroyedEvent.getDestructionObservable(this.model);

    this.change$ = this.modelChangedEvent.getObservableForModel(this.model).pipe(map(_ => undefined));
  }

  /**
   * @inheritdoc
   */
  public readonly destroyed$: Observable<void>;

  /**
   * @inheritdoc
   */
  public readonly change$: Observable<void>;

  /**
   * @inheritdoc
   */
  public createChild<T extends object>(child: Constructable<T> | ModelJson, parent: object = this.model): T {
    if (typeof child === 'function') {
      return this.modelManager.create<T>(child, parent);
    }

    return this.deserializationManager.deserialize(child, PropertyLocation.forUnassignedChildModel(parent));
  }

  /**
   * @inheritdoc
   */
  public destroyChild(child: object): void {
    this.modelManager.destroy(child);
  }

  /**
   * @inheritdoc
   */
  public getData<T, R>(request?: R): Observable<T> {
    const dataSource = this.dataSourceManager.getClosest<T>(this.model);

    if (!dataSource) {
      this.logger.warn('No data source found when trying to retrieve data for model');

      return EMPTY;
    }

    return dataSource.getData(request);
  }

  /**
   * @inheritdoc
   */
  public getTheme<T extends Theme>(): MergedTheme<T> {
    return this.themeManager.getThemeForModel(this.model);
  }

  /**
   * @inheritdoc
   */
  public setVariable(variableKey: string, value: unknown, modelScope: object = this.model): void {
    this.variableManager.set(variableKey, value, modelScope);
  }

  /**
   * @inheritdoc
   */
  public setDataSource(value: DataSource<unknown>, modelScope: object = this.model): void {
    this.dataSourceManager.attach(value, modelScope);
  }

  /**
   * @inheritdoc
   */
  public getTimeRange(): TimeRange | undefined {
    return this.timeRangeManager.getClosest(this.model);
  }
}
