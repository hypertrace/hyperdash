import { LogLevel } from './log-level';
import { DefaultLogMessage, LogMessage } from './log-message';

/**
 * Logging utility
 */
export class Logger {
  private static readonly LOG_PRIORITY: ReadonlyArray<LogLevel> = [
    LogLevel.Debug,
    LogLevel.Info,
    LogLevel.Warn,
    LogLevel.Error
  ];

  private static readonly DEFAULT_LOG_MESSAGE_BUILDER: LogMessageBuilder = (
    level: LogLevel,
    message: string,
    source?: LogMessage
  ) => new DefaultLogMessage(level, message, source);

  private logLevel: LogLevel = LogLevel.Info;
  private logMessageBuilder: LogMessageBuilder = Logger.DEFAULT_LOG_MESSAGE_BUILDER;

  public constructor(private readonly loggerName: string = '') {}

  /**
   * Log provided message at info level
   */
  public info(message: string, source?: Error | LogMessage): LogMessage {
    return this.log(LogLevel.Info, message, source);
  }

  /**
   * Log provided message at debug level
   */
  public debug(message: string, source?: Error | LogMessage): LogMessage {
    return this.log(LogLevel.Debug, message, source);
  }

  /**
   * Log provided message at error level
   */
  public error(message: string, source?: Error | LogMessage): LogMessage {
    return this.log(LogLevel.Error, message, source);
  }

  /**
   * Log provided message at warn level
   */
  public warn(message: string, source?: Error | LogMessage): LogMessage {
    return this.log(LogLevel.Warn, message, source);
  }

  /**
   * Log provided message at requested level
   */
  public log(logLevel: LogLevel, message: string, source?: Error | LogMessage): LogMessage {
    const loggerNamePrefix = this.loggerName.length > 0 ? `[${this.loggerName}] ` : '';

    const logMessage = this.logMessageBuilder(
      logLevel,
      `${loggerNamePrefix}${message}`,
      this.convertSourceToLogMessageOrUndefined(source)
    );
    if (this.shouldLogMessage(this.logLevel, logMessage)) {
      logMessage.log();
    }

    return logMessage;
  }

  /**
   * Set the minimum log level. Any log statements that are at a more verbose level are not logged..
   */
  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * Provides a log message builder to implement custom logging behavior
   */
  public setLogMessageBuilder(builder: LogMessageBuilder): void {
    this.logMessageBuilder = builder;
  }

  private shouldLogMessage(minimumLevel: LogLevel, logMessage: LogMessage): boolean {
    return Logger.LOG_PRIORITY.indexOf(logMessage.level) >= Logger.LOG_PRIORITY.indexOf(minimumLevel);
  }

  private convertSourceToLogMessageOrUndefined(source?: Error | LogMessage): LogMessage | undefined {
    if (source && source instanceof Error) {
      return this.logMessageBuilder(LogLevel.Error, source.message);
    }

    return source;
  }
}

export type LogMessageBuilder = (level: LogLevel, message: string, source?: LogMessage) => LogMessage;
