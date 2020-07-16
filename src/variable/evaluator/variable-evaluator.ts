import { difference, get } from 'lodash-es';
import { ExpressionParser } from '../parser/expression-parser';
import { ParseNode, ParseNodeType } from '../parser/parse-node';
import { ResolveDictionary } from '../variable-dictionary';

/**
 * Provides an evaluator for re-evaluating the same variable string
 * against different variable values.
 */
export class VariableEvaluator<T = unknown> {
  private readonly parser: ExpressionParser;
  private readonly variableNamesFromLastEvaluate: Set<string> = new Set();

  public constructor(private readonly variableString: string) {
    this.parser = new ExpressionParser(variableString);
  }

  /**
   * Does the evaluation, using the provided dictionary to perform any variable lookups
   */
  public evaluate(dictionary: ResolveDictionary): EvaluationResult<T> {
    const variablesBeforeEvaluate = [...this.variableNamesFromLastEvaluate];
    this.variableNamesFromLastEvaluate.clear();
    const result: EvaluationResult<T> = {
      variableNamesAdded: [],
      variableNamesRemoved: []
    };

    try {
      const value = this.convertNodeToValue(this.parser.parse(), dictionary) as T;
      result.value = value;
    } catch (e) {
      result.error = e && (e as Error).message;
    }

    const variablesAfterEvaluate = [...this.variableNamesFromLastEvaluate];
    result.variableNamesRemoved = difference(variablesBeforeEvaluate, variablesAfterEvaluate);
    result.variableNamesAdded = difference(variablesAfterEvaluate, variablesBeforeEvaluate);

    return result;
  }

  /**
   * Returns result indicating state before evaluation ocurred
   */
  public unevaluate(): EvaluationResult<string> {
    const variableNamesFromLastEvaluate = [...this.variableNamesFromLastEvaluate];
    this.variableNamesFromLastEvaluate.clear();

    return {
      variableNamesAdded: [],
      variableNamesRemoved: variableNamesFromLastEvaluate,
      value: this.variableString
    };
  }

  private convertNodeToValue(node: ParseNode, dictionary: ResolveDictionary): unknown {
    if (node.error) {
      throw new Error(node.error);
    }
    // tslint:disable-next-line:switch-default https://github.com/palantir/tslint/issues/2104
    switch (node.type) {
      case ParseNodeType.Root:
        return this.convertRootNodeToValue(node, dictionary);
      case ParseNodeType.EscapedCharacter:
        return this.convertEscapedCharacterToValue(node);
      case ParseNodeType.Text:
        return this.convertTextToValue(node);
      case ParseNodeType.Expression:
        return this.convertExpressionToValue(node, dictionary);
    }
  }

  private convertRootNodeToValue(node: ParseNode, dictionary: ResolveDictionary): unknown {
    if (node.children.length === 1) {
      return this.convertNodeToValue(node.children[0], dictionary);
    }

    return this.mapAndJoinChildren(node, dictionary);
  }

  private convertEscapedCharacterToValue(node: ParseNode): string {
    return this.variableString.charAt(node.start + node.length - 1); // Last char of node
  }

  private convertTextToValue(node: ParseNode): string {
    return this.variableString.substr(node.start, node.length); // Last char of node
  }

  private convertExpressionToValue(node: ParseNode, dictionary: ResolveDictionary): unknown {
    const propertyPath = this.mapAndJoinChildren(node, dictionary).trim();

    this.variableNamesFromLastEvaluate.add(propertyPath.split('.')[0]);

    const result = get(dictionary, propertyPath);
    if (result !== undefined) {
      // Treat undefined as unable to look up. We don't allow assignment of undefined.
      return result;
    }
    throw new Error(`Could not lookup variable value: ${propertyPath}`);
  }

  private mapAndJoinChildren(node: ParseNode, dictionary: ResolveDictionary): string {
    const caughtErrors: Error[] = [];
    const mappedValues = node.children.map(child => {
      try {
        return this.convertNodeToValue(child, dictionary);
      } catch (e) {
        caughtErrors.push(e as Error);
      }
    });

    if (caughtErrors.length > 0) {
      throw this.combineErrors(caughtErrors);
    }

    return mappedValues.join('');
  }

  private combineErrors(errorArray: Error[]): Error {
    return Error(errorArray.map(error => error.message).join('; '));
  }
}

/**
 * The results of evaluating a particular expression
 */
export interface EvaluationResult<T> {
  /**
   * The resolved value of the evaluation
   */
  value?: T;
  /**
   * Any errors resulting from evaluation
   */
  error?: string;
  /**
   * Variable names used that were not used in the previous evaluation
   */
  variableNamesAdded: string[];
  /**
   * Variable names which were not used in this evaluation, but were on the previous evaluation
   */
  variableNamesRemoved: string[];
}
