/**
 * A lifecycle hook that is invoked during model construction after all properties
 * have been assigned and potentially deserialized and initialized.
 */
export interface ModelOnInit {
  /**
   * Callback method which is invoked during construction and should include any
   * initialization logic.
   */
  modelOnInit(): void;
}

/**
 * A lifecycle hook that is invoked during model destruction, before the model has
 * been removed from all systems, and before the destruction event has been broadcast.
 * All children are destroyed before this is invoked.
 */
export interface ModelOnDestroy {
  /**
   * Callback method which is invoked during destruction and should include any
   * cleanup logic.
   */
  modelOnDestroy(): void;
}
