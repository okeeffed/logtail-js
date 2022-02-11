import { Context } from "@logtail/types";
import { dirname, relative } from "path";
import stackTrace, { StackFrame } from "stack-trace";
import { Node } from "./node";

/**
 * Determines the file name and the line number from which the log
 * was initiated (if we're able to tell).
 *
 * @returns Context The caller's filename and the line number
 */
export function getStackContext(logtail: Node): Context {
  const stackFrame = getCallingFrame(logtail);
  if (stackFrame === null) return {};

  return {
    context: {
      runtime: {
        file: relativeToMainModule(stackFrame.getFileName()),
        type: stackFrame.getTypeName(),
        method: stackFrame.getMethodName(),
        function: stackFrame.getFunctionName(),
        line: stackFrame.getLineNumber(),
        column: stackFrame.getColumnNumber(),
      },
      system: {
        pid: process.pid,
        main_file: mainFileName(),
      },
    },
  };
}

function getCallingFrame(logtail: Node): StackFrame | null {
  // const supportedFnNames = ["warn", "error", "info", "log"];

  for (let fn of [logtail.warn, logtail.error, logtail.info, logtail.log]) {
    const stack = stackTrace.get(fn as any);

    const frames = stack.map((frame) => ({
      fileName: frame.getFileName(),
      lineNumber: frame.getLineNumber(),
      columnNumber: frame.getColumnNumber(),
      methodName: frame.getMethodName(),
      functionName: frame.getFunctionName(),
      typeName: frame.getTypeName(),
    }));

    if (stack.length > 0) {
      // We check through the stack to find the first instance of `Object`
      // which equals our Logtail object and expected logging function invocation.
      const logInvocationIndex = stack.findIndex(
        (frame) => frame.getTypeName() === "Object"
      );

      // If we do not find the expected function invocation, we default to the
      // prior behaviour of returning the first frame in the stack. Otherwise,
      // we return the frame that invoked the logging function.
      if (logInvocationIndex !== -1) {
        console.log(stack[logInvocationIndex].getLineNumber());
        return stack[logInvocationIndex];
      }

      return stack[0];
    }
  }

  return null;
}

function relativeToMainModule(fileName: string): string | null {
  if (typeof fileName !== "string") {
    return null;
  } else if (fileName.startsWith("file:/")) {
    const url = new URL(fileName);
    return url.pathname;
  } else {
    const rootPath = dirname(mainFileName());
    return relative(rootPath, fileName);
  }
}

function mainFileName(): string {
  return require?.main?.filename ?? "";
}
