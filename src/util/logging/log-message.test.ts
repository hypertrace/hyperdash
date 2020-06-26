import { LogLevel } from './log-level';
import { DefaultLogMessage } from './log-message';

describe('Default Log message', () => {
  const messageText = 'test message';
  test('info level', () => {
    const message = new DefaultLogMessage(LogLevel.Info, messageText);

    expect(message.toString()).toEqual('INFO: test message');

    const infoSpy = spyOn(console, 'info');

    message.log();
    expect(infoSpy).toHaveBeenCalledWith('INFO: test message');
  });

  test('info level', () => {
    const message = new DefaultLogMessage(LogLevel.Info, messageText);

    expect(message.toString()).toEqual('INFO: test message');

    const infoSpy = spyOn(console, 'info');

    message.log();
    expect(infoSpy).toHaveBeenCalledWith('INFO: test message');
  });

  test('warn level', () => {
    const message = new DefaultLogMessage(LogLevel.Warn, messageText);

    expect(message.toString()).toEqual('WARN: test message');

    const warnSpy = spyOn(console, 'warn');

    message.log();
    expect(warnSpy).toHaveBeenCalledWith('WARN: test message');
  });

  test('debug level', () => {
    const message = new DefaultLogMessage(LogLevel.Debug, messageText);

    expect(message.toString()).toEqual('DEBUG: test message');

    const debugSpy = spyOn(console, 'debug');

    message.log();
    expect(debugSpy).toHaveBeenCalledWith('DEBUG: test message');
  });

  test('error level', () => {
    const message = new DefaultLogMessage(LogLevel.Error, messageText);

    expect(message.toString()).toEqual('ERROR: test message');

    const errorSpy = spyOn(console, 'error');

    message.log();
    expect(errorSpy).toHaveBeenCalledWith('ERROR: test message');
  });

  test('source messages are printed out', () => {
    const rootSource = new DefaultLogMessage(LogLevel.Info, 'root');
    const intermediateSource = new DefaultLogMessage(LogLevel.Info, 'intermediate', rootSource);
    const message = new DefaultLogMessage(LogLevel.Warn, messageText, intermediateSource);

    expect(message.toString()).toBe('WARN: test message\n  ↳ intermediate\n      ↳ root');
  });

  test('throws errors if requested', () => {
    expect(() => new DefaultLogMessage(LogLevel.Warn, messageText).throw()).toThrow('test message');
  });
});
