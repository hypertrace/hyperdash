import { LogLevel } from './log-level';
import { DefaultLogMessage, LogMessage } from './log-message';
import { Logger } from './logger';

jest.mock('./log-message');

describe('Logger', () => {
  let logger: Logger;
  let messageBuilder: jest.Mock<LogMessage, [LogLevel]>;
  let mockMessage: Partial<LogMessage>;
  const mockedLogMessageConstructor = (DefaultLogMessage as unknown) as jest.Mock<DefaultLogMessage>;

  beforeEach(() => {
    logger = new Logger();
    mockedLogMessageConstructor.mockClear();
    messageBuilder = jest.fn((logLevel: LogLevel) => {
      mockMessage = {
        level: logLevel,
        log: jest.fn()
      };

      return mockMessage as LogMessage;
    });
    logger.setLogMessageBuilder(messageBuilder);
  });

  test('log methods map to correct level', () => {
    logger.log = jest.fn();

    logger.info('test info');
    expect(logger.log).toHaveBeenLastCalledWith(LogLevel.Info, 'test info', undefined);

    logger.warn('test warn');
    expect(logger.log).toHaveBeenLastCalledWith(LogLevel.Warn, 'test warn', undefined);

    logger.error('test error');
    expect(logger.log).toHaveBeenLastCalledWith(LogLevel.Error, 'test error', undefined);

    logger.debug('test debug');
    expect(logger.log).toHaveBeenLastCalledWith(LogLevel.Debug, 'test debug', undefined);
  });

  test('log message includes logger name if defined', () => {
    logger.debug('my message');

    expect(messageBuilder).toHaveBeenCalledWith(LogLevel.Debug, 'my message', undefined);

    messageBuilder.mockClear();
    const namedLogger = new Logger('my name');
    namedLogger.setLogMessageBuilder(messageBuilder);

    namedLogger.debug('my message');

    expect(messageBuilder).toHaveBeenCalledWith(LogLevel.Debug, '[my name] my message', undefined);
  });

  test('respects log level', () => {
    logger.setLogLevel(LogLevel.Warn);
    logger.info('my message');
    expect(mockMessage.log).not.toHaveBeenCalled();

    logger.warn('my warn message');

    expect(mockMessage.log).toHaveBeenCalled();
  });

  test('passes source log message', () => {
    const sourceLogMessage = {};

    logger.debug('root message', sourceLogMessage as LogMessage);

    expect(messageBuilder).toHaveBeenCalledWith(LogLevel.Debug, 'root message', sourceLogMessage);
  });

  test('uses DefaultLogMessage by default', () => {
    logger = new Logger();

    logger.debug('my message');
    expect(DefaultLogMessage).toHaveBeenCalledWith(LogLevel.Debug, 'my message', undefined);
  });

  test('treats error source as a nested log message', () => {
    logger = new Logger();
    logger.debug('my message', Error('source error'));

    expect(mockedLogMessageConstructor).toHaveBeenCalledTimes(2);
    expect(mockedLogMessageConstructor).toHaveBeenNthCalledWith(1, LogLevel.Error, 'source error', undefined);
    expect(mockedLogMessageConstructor).toHaveBeenNthCalledWith(
      2,
      LogLevel.Debug,
      'my message',
      mockedLogMessageConstructor.mock.instances[0]
    );
  });
});
