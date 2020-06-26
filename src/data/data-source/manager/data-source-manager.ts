import { ModelManager } from '../../../hyperdash';
import { PropertyLocation } from '../../../model/property/property-location';
import { ModelJson } from '../../../persistence/model-json';
import { DataSource, dataSourceMarker, ModelJsonWithData } from '../data-source';

/**
 * Manages data sources and their associations with specific models
 */
export class DataSourceManager {
  public constructor(private readonly modelManager: ModelManager) {}

  private readonly dataSourceByModelInstance: WeakMap<object, DataSource<unknown>> = new WeakMap();
  private readonly rootDataSourceByModelRoot: WeakMap<object, DataSource<unknown>> = new WeakMap();

  /**
   * Attaches a data source to the specified model. Overwrites any existing data source for
   * the specified model.
   */
  public attach<T = unknown>(dataSource: DataSource<T>, model: object): void {
    this.dataSourceByModelInstance.set(model, dataSource);
  }

  /**
   * Removes the data source for the specified model. No action is taken if a data source is not defined
   * for this specific model.
   */
  public detach(model: object): void {
    this.dataSourceByModelInstance.delete(model);
  }

  /**
   * Retrieves the data source for this model, if it exists. Returns undefined otherwise.
   */
  public get<T>(model: object): DataSource<T> | undefined {
    return this.dataSourceByModelInstance.get(model) as DataSource<T> | undefined;
  }

  /**
   * Type predicate returning true if the provided model object is a data source
   */
  public isDataSource<TData = unknown, TModel extends Partial<DataSource<TData>> = {}>(
    model: TModel
  ): model is DataSource<TData> & TModel {
    if (model.dataSourceMarker && model.getData) {
      // tslint:disable-next-line:strict-type-predicates
      return typeof model.getData === 'function' && model.dataSourceMarker === dataSourceMarker;
    }

    return false;
  }

  /**
   * Returns true if the model JSON provided contains a data property
   */
  public modelJsonHasData(modelJson: ModelJson): modelJson is ModelJsonWithData {
    return 'data' in modelJson && typeof modelJson.data === 'object' && modelJson.data !== null;
  }

  /**
   * Returns a property location corresponding to the data attached to the provided model
   */
  public getPropertyLocationForData(instance: object): PropertyLocation<DataSource<unknown>> {
    return new PropertyLocation(
      instance,
      'data',
      (value: DataSource<unknown> | undefined) => {
        if (value === undefined) {
          this.detach(instance);
        } else {
          this.attach(value, instance);
        }
      },
      () => this.get(instance)
    );
  }

  /**
   * Retrieves the data source attached to this model, if it exists. If not, it recursively checks for data sources
   * attached to ancestors, returning the closest, or undefined if no ancestor has a data source.
   * If the provided model is a data source, it will skip checking its parent, which would return the original
   * data modelInstance, and start its search with a grandparent model, continuing upwards like a regular model.
   */
  public getClosest<T>(modelInstance: object): DataSource<T> | undefined {
    const attachedDataSource = this.get<T>(modelInstance);
    if (attachedDataSource) {
      return attachedDataSource;
    }

    let parent: object | undefined;

    if (this.isDataSource(modelInstance)) {
      // For a data source, its parent would have the original data source attached, so skip a level
      const attachedFromModel = this.modelManager.getParent(modelInstance);
      parent = attachedFromModel && this.modelManager.getParent(attachedFromModel);
    } else {
      parent = this.modelManager.getParent(modelInstance);
    }

    if (!parent) {
      const rootDataSource = this.getRootDataSource<T>(modelInstance);

      // If the root data source is the requestor, then don't give itself back, return undefined
      return rootDataSource === modelInstance ? undefined : rootDataSource;
    }

    return this.getClosest(parent);
  }

  /**
   * Sets the root data source for the provided model tree. This data source will be used at the root of the resolution
   * tree.
   */
  public setRootDataSource<T = unknown>(dataSource: DataSource<T>, rootModelInstance: object): void {
    this.rootDataSourceByModelRoot.set(rootModelInstance, dataSource);
  }

  /**
   * Retrieves the root data source for the tree containing the provided model, or undefined if missing.
   */
  public getRootDataSource<T = unknown>(modelInstance: object): DataSource<T> | undefined {
    return this.rootDataSourceByModelRoot.get(this.modelManager.getRoot(modelInstance)) as DataSource<T> | undefined;
  }
}
