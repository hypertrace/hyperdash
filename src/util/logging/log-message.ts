import { LogLevel } from './log-level';

/**
 * Represents a log message emitted at a specific level.
 * Potentially has a source of other log messages.
 */
export interface LogMessage {
  /**
   * Log level for this message
   */
  level: LogLevel;
  /**
   * Log message
   */
  message: string;
  /**
   * Any potential source message for this message
   */
  source?: LogMessage;
  /**
   * Perform the actual logging
   */
  log(): void;
  /**
   * Throws the log message as an error
   */
  throw(): never;
}

/**
 * Default log message outputting to console
 */
export class DefaultLogMessage implements LogMessage {
  private static readonly DEFAULT_INDENT: string = '    ';

  public constructor(
    public readonly level: LogLevel,
    public readonly message: string,
    public readonly source?: Readonly<LogMessage>
  ) {}

  /**
   * Convert the message, and any sources to a stack string
   */
  public toString(): string {
    return `${this.level}: ${this.getMessageWithStack()}`;
  }

  /**
   * Perform the actual logging, sending the result of toString to console.
   */
  public log(): void {
    this.getLogMethod()(this.toString());
  }

  /**
   * Throws the log message as an error
   */
  public throw(): never {
    throw Error(this.getMessageWithStack());
  }

  private getMessageWithStack(): string {
    const stack = this.getFormattedSourceStack();
    const lineSeparatorIfStack = stack.length === 0 ? '' : '\n';

    return `${this.message}${lineSeparatorIfStack}${stack}`;
  }

  private getFormattedSourceStack(): string {
    if (!this.source) {
      return '';
    }

    return this.getSourceMessages()
      .map((message: string, index: number) => this.getIndent(index + 1) + message)
      .join('\n');
  }

  private getSourceMessages(): string[] {
    const sourceMessages = [];
    let currentSourceObject: Readonly<LogMessage> | undefined = this.source;

    while (currentSourceObject) {
      sourceMessages.push(currentSourceObject.message);
      currentSourceObject = currentSourceObject.source;
    }

    return sourceMessages;
  }

  private getIndent(count: number): string {
    return DefaultLogMessage.DEFAULT_INDENT.repeat(count).replace(/  $/, '↳ ');
  }

  private getLogMethod(): (message: string) => void {
    /* eslint-disable no-console */
    switch (this.level) {
      case LogLevel.Warn:
        return console.warn;
      case LogLevel.Error:
        return console.error;
      case LogLevel.Debug:
        return console.debug;
      case LogLevel.Info:
      default:
        return console.info;
    }
    /* eslint-enable no-console */
  }
}
