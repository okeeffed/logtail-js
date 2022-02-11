import bunyan, { LogLevelString } from "bunyan";
import { Logtail } from "@logtail/node";
import { LogLevel, Context } from "@logtail/types";

import { LogtailStream } from "./bunyan";

// Numeric log level test type
type LevelTest = [number, LogLevel, LogLevelString];

// Sample log message
const message = "Something to do with something";

/**
 * Create a Bunyan logger instance
 *
 * @param logtail - `Logtail` instance
 */
function createLogger(logtail: Logtail): bunyan {
  return bunyan.createLogger({
    name: "Test logger",
    level: "debug", // <-- default to 'debug' and above
    streams: [
      {
        stream: new LogtailStream(logtail),
      },
    ],
  });
}

/**
 * Test a Bunyan log level vs. a Logtail `LogLevel`
 *
 * @param level LogLevelString - Bunyan log level (string)
 * @param logLevel LogLevel - Logtail log level
 * @param cb Function - Callback to execute to signal test completion
 */
async function testLevel(
  level: LogLevelString,
  logLevel: LogLevel,
  cb: Function
) {
  // Logtail fixtures
  const logtail = new Logtail("test", { batchInterval: 1 });
  logtail.setSync(async (logs) => {
    // Should be exactly one log
    expect(logs.length).toBe(1);

    // Message should match
    expect(logs[0].message).toBe(message);

    // Log level should be 'info'
    expect(logs[0].level).toBe(logLevel);

    // Log runtime value should be set to which file called the logging function
    expect(((logs[0].context as Context).runtime as Context).file).toBe(
      "bunyan.test.ts"
    );

    // Signal that the test has finished
    setImmediate(() => cb());

    return logs;
  });

  // Create Bunyan logger
  const logger = createLogger(logtail);

  // Log out to Bunyan
  logger[level](message);
}

describe("Bunyan tests", () => {
  it("should log at the 'debug' level", async (done) => {
    return testLevel("debug", LogLevel.Debug, done);
  });

  it("should log at the 'info' level", async (done) => {
    return testLevel("info", LogLevel.Info, done);
  });

  it("should log at the 'warn' level", async (done) => {
    return testLevel("warn", LogLevel.Warn, done);
  });

  it("should log at the 'error' level", async (done) => {
    return testLevel("error", LogLevel.Error, done);
  });

  it("should log at the 'fatal' level", async (done) => {
    return testLevel("fatal", LogLevel.Error, done);
  });

  it("should log using number levels", async (done) => {
    // Fixtures
    const levels: LevelTest[] = [
      [25, LogLevel.Debug, "debug"],
      [35, LogLevel.Info, "info"],
      [45, LogLevel.Warn, "warn"],
      [55, LogLevel.Error, "error"],
    ];

    const logtail = new Logtail("test", {
      batchInterval: 1000,
      batchSize: levels.length,
    });

    logtail.setSync(async (logs) => {
      expect(logs.length).toBe(levels.length);
      done();
      return logs;
    });

    // Create Bunyan logger
    const logger = createLogger(logtail);

    // Cycle through levels, and log
    levels.forEach((level) => logger[level[2]](message));
  });

  it("should include arbitrary extra data fields", async (done) => {
    const logtail = new Logtail("test");
    logtail.setSync(async (logs) => {
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toEqual("i am the message");
      expect(logs[0].foo).toEqual("bar");
      expect(logs[0].some).toEqual({ nested: "stuff" });
      done();
      return logs;
    });
    const logger = createLogger(logtail);
    logger.info({ foo: "bar", some: { nested: "stuff" } }, "i am the message");
  });
});
