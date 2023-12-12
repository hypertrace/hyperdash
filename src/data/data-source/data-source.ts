import { Observable } from 'rxjs';
import { ModelJson } from '../../persistence/model-json';

export const dataSourceMarker = Symbol('Data Source Marker');

/**
 * A model which can be used to retrieve data asynchronously
 */
export interface DataSource<T, R = unknown> {
  /**
   * Retrieves data of type T in the form of an observable
   */
  getData(request?: R): Observable<T>;

  /**
   * A marker property used to determine if the implementing class is
   * actually a data source (since the interface itself is not reified)
   */
  readonly dataSourceMarker: typeof dataSourceMarker;
}

/**
 * A fragment of serialized JSON representing a model with an attached data source
 */
export interface ModelJsonWithData extends ModelJson {
  /**
   * A fragment of serialized JSON representing a data source
   */
  data: ModelJson;
}
