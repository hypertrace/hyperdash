import { ModelApi } from '../model-api';

/**
 * Builds an API object for a provided model
 */
export interface ModelApiBuilder<T extends ModelApi> {
  /**
   * Returns true if this builder can build an API for the provided model
   */
  matches(model: object): boolean;

  /**
   * Builds an API object for the provided model. It does not install the API.
   * Any models provided to this method are guaranteed to have passed the `matches` predicate
   */
  build(model: object): T;
}
