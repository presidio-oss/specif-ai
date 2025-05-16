import {
  GuardrailsEngine,
  GuardrailsEngineResult,
  LLMMessage,
  injectionGuard,
  leakageGuard,
  piiGuard,
  secretGuard,
  SelectionType
} from "@presidio-dev/hai-guardrails";
import { LLMHandler } from "../services/llm/llm-handler";

export class GuardrailsShouldBlock extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GuardrailsShouldBlock";
  }
}

export function createComprehensiveGuardrails() {
  // Injection protection with multiple tactics
  const heuristicInjectionGuard = injectionGuard(
    { roles: ['user'], selection: SelectionType.Last },
    { mode: 'heuristic', threshold: 0.8 }
  )

  const patternInjectionGuard = injectionGuard(
    { roles: ['user'], selection: SelectionType.Last },
    { mode: 'pattern', threshold: 0.8 }
  )

  // Leakage protection
  const leakageGuardrail = leakageGuard({ roles: ['user'], selection: SelectionType.Last }, { mode: 'heuristic', threshold: 0.8 })

  // PII and secret protection
  const piiGuardrail = piiGuard({ mode: 'redact' })
  const secretGuardrail = secretGuard({ mode: 'redact' })

  // Create engine with all guards
  return new GuardrailsEngine({
    guards: [
      // TODO: Enable heuristic injection guard when ready
      // heuristicInjectionGuard,
      patternInjectionGuard,
      leakageGuardrail,
      piiGuardrail,
      secretGuardrail,
    ],
  })
}

export const guardrailsEngine = createComprehensiveGuardrails();

// export const guardrailsEngine = createComprehensiveGuardrails();

export const isBlockedByGuard = (guardResult: GuardrailsEngineResult) => {
  return guardResult.messagesWithGuardResult.some((message) =>
    message.messages.some((message) => !message.passed)
  );
};

export const generateLLMMessage = (messages: string | any[]): LLMMessage[] => {
  if (typeof messages === "string") {
    return [{
      role: "user",
      content: messages,
    }];
  }
  
  if (Array.isArray(messages)) {
    return messages.map(message => ({
      role: message.role || "user",
      content: typeof message.content === "string" 
        ? message.content 
        : message.content?.text || message.content,
      ...(message.id && { id: message.id }),
      ...(message.tool_calls && { tool_calls: message.tool_calls })
    }));
  }

  throw new Error("Invalid message format");
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

export async function validateGuardrails(messages: string | any[]): Promise<LLMMessage[]> {
  const llmMessages = generateLLMMessage(messages);
  
  // Find messages that need validation (user messages)
  const messagesToValidate = llmMessages.filter(msg => msg.role === "user");
  
  if (messagesToValidate.length === 0) {
    return llmMessages; // No user messages to validate
  }

  // Validate only user messages
  for (const message of messagesToValidate) {
    const guardResult = await guardrailsEngine.run([message]);
    console.log("Guard result:", JSON.stringify(guardResult));
    if (isBlockedByGuard(guardResult)) {
      throw new GuardrailsShouldBlock("Guardrails blocked the response");
    }
  }

  return llmMessages;
}

const DEFAULT_HANDLER: ProxyHandler<LLMHandler> = {
  invoke: async (method, target, thisArg, args, guardrailsEngine) => {
    const [messages, systemPrompt, operation] = args;
    const validatedMessages = await validateGuardrails(messages);
    return method.apply(thisArg, [
      validatedMessages,
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
