import { ModelManager } from '../model/manager/model-manager';
import { PropertyLocation } from '../model/property/property-location';
import { ModelLibrary } from '../model/registration/model-registration';
import { ModelJson } from '../persistence/model-json';
import { Constructable } from '../util/constructable';
import { MergedTheme, ModelJsonWithTheme, Theme } from './theme';

/**
 * Manages themes for dashboards, allowing assigning retrieving hierarchical themes
 * tied to specific model instances.
 */
export class ThemeManager {
  private readonly themeByModel: WeakMap<object, Theme> = new WeakMap();
  private globalTheme!: Required<Theme>;
  public constructor(
    private readonly modelManager: ModelManager,
    private readonly modelLibrary: ModelLibrary,
    globalTheme: Required<Theme>
  ) {
    this.setGlobalTheme(globalTheme);
  }

  /**
   * Sets the global theme
   */
  public setGlobalTheme(theme: Required<Theme>): void {
    this.globalTheme = theme;
  }

  /**
   * Sets specific overrides for the given model instance
   */
  public setThemeForModel(theme: Theme, model: object): void {
    this.themeByModel.set(model, theme);
  }

  /**
   * Removes theme overrides for provided model
   */
  public removeThemeForModel(model: object): void {
    this.themeByModel.delete(model);
  }

  /**
   * Retrieves a merged theme for the provided model applying
   * overrides in order of specificity.
   */
  public getThemeForModel<T extends Theme>(model: object): MergedTheme<T> {
    return Object.assign({}, ...this.getThemeHierarchy(model)) as Required<T>;
  }

  /**
   * Returns true if the model JSON provided contains a theme property
   */
  public modelJsonHasTheme(modelJson: ModelJson): modelJson is ModelJsonWithTheme {
    // eslint-disable-next-line no-null/no-null
    return 'theme' in modelJson && typeof modelJson.theme === 'object' && modelJson.theme !== null;
  }

  /**
   * Returns a property location corresponding to the theme attached to the provided model
   */
  public getPropertyLocationForTheme(instance: object): PropertyLocation<Theme> {
    return new PropertyLocation(
      instance,
      'theme',
      (value: Theme | undefined) => {
        if (value === undefined) {
          this.removeThemeForModel(instance);
        } else {
          this.setThemeForModel(value, instance);
        }
      },
      () => this.getThemeOverrideObjectProvidedByModel(instance)
    );
  }

  /**
   * Retrieves the value of the theme property associated with the provided key for this model.
   * Note: the propertyKey is not necessarily the same as the runtime key. It is the serialization key.
   */
  public getThemePropertyForModel<T = string>(model: object, propertyKey: string): T | undefined {
    const matchedTheme = this.getThemeHierarchy(model)
      .reverse()
      .find(theme => {
        if (!theme) {
          return false;
        }
        const runtimeKeyForTheme = this.getThemeRuntimeKey(theme, propertyKey);
        if (!runtimeKeyForTheme) {
          return false;
        }

        return runtimeKeyForTheme in theme;
      });

    return matchedTheme && ((matchedTheme[this.getThemeRuntimeKey(matchedTheme, propertyKey)!] as unknown) as T);
  }

  /**
   * Returns the original Theme object provided for this model, if any. This does not include
   * any resolved theme properties from parents or globals.
   */
  public getThemeOverrideObjectProvidedByModel(model: object): Theme | undefined {
    return this.themeByModel.get(model);
  }

  private getThemeRuntimeKey<T extends Theme>(theme: T, propertyKey: string): keyof T | undefined {
    const properties = this.modelLibrary.lookupModelProperties(theme.constructor as Constructable<T>);

    const matchingMetadata = Array.from(properties).find(themePropMetadata => themePropMetadata.key === propertyKey);

    return matchingMetadata && matchingMetadata.runtimeKey;
  }

  private getThemeHierarchy(model: object): (Theme | undefined)[] {
    const themeHierarchy = [];
    let currModel: object | undefined = model;
    while (currModel) {
      themeHierarchy.unshift(this.themeByModel.get(currModel));
      currModel = this.modelManager.getParent(currModel);
    }

    // Always add global theme as first in hierarchy
    themeHierarchy.unshift(this.globalTheme);

    return themeHierarchy;
  }
}
