import {
  GuardrailsEngine,
  GuardrailsEngineResult,
  LLMMessage,
  injectionGuard,
  leakageGuard,
  piiGuard,
  secretGuard,
  SelectionType,
} from "@presidio-dev/hai-guardrails";
import { LLMHandler } from "../services/llm/llm-handler";

export class GuardrailsShouldBlock extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GuardrailsShouldBlock";
  }
}

export const guardrailsEngine = new GuardrailsEngine({
  guards: [
    injectionGuard(
      {
        selection: SelectionType.Last,
      },
      {
        mode: "pattern",
        threshold: 0.95,
      }
    ),
    leakageGuard(
      {
        selection: SelectionType.Last,
      },
      {
        mode: "pattern",
        threshold: 0.95,
      }
    ),
    piiGuard(),
    secretGuard(),
  ],
});

export const isBlockedByGuard = (guardResult: GuardrailsEngineResult) => {
  return guardResult.messagesWithGuardResult.some((message) =>
    message.messages.some((message) => !message.passed)
  );
};

export const generateLLMMessage = (messages: string | any[]): LLMMessage[] => {
  if (typeof messages === "string") {
    return [
      {
        role: "user",
        content: messages,
      },
    ];
  } else if (Array.isArray(messages)) {
    return messages.map((message) => {
      return {
        ...message,
        role: message.role as string,
        content: message.content as string,
      };
    });
  } else {
    throw new Error("Invalid message format");
  }
};

type ProxyHandler<T extends LLMHandler> = {
  [K in keyof T]?: T[K] extends (...args: infer Args) => infer Return
    ? (
        originalFn: T[K],
        target: T,
        thisArg: T,
        args: Args,
        guardrailsEngine: GuardrailsEngine
      ) => Return | Promise<Return>
    : never;
};

const DEFAULT_HANDLER: ProxyHandler<LLMHandler> = {
  invoke: async (method, target, thisArg, args, guardrailsEngine) => {
    const [messages, systemPrompt, operation] = args;
    const llmMessages = generateLLMMessage(messages);
    const guardResult = await guardrailsEngine.run(llmMessages);
    if (isBlockedByGuard(guardResult)) {
      throw new GuardrailsShouldBlock("Guardrails blocked the response");
    }
    return method.apply(thisArg, [
      guardResult.messages,
      systemPrompt,
      operation,
    ]);
  },
};

export const LLMHandlerGuardrails = <T extends LLMHandler>(
  original: T,
  handler: ProxyHandler<T> = {}
): T => {
  handler = { ...DEFAULT_HANDLER, ...handler };
  return new Proxy(original, {
    get(target, prop, receiver) {
      const originalValue = Reflect.get(target, prop, receiver);
      const methodName = prop as keyof T;
      const method = originalValue as T[typeof methodName];
      const customHandler = handler?.[methodName];
      if (
        typeof originalValue !== "function" ||
        !customHandler ||
        guardrailsEngine.isDisabled
      ) {
        return originalValue;
      }
      return function (this: T, ...args: unknown[]) {
        return (async () => {
          return customHandler(
            method,
            target,
            this === receiver ? target : this,
            args,
            guardrailsEngine
          );
        })();
      };
    },
  }) as T;
};
