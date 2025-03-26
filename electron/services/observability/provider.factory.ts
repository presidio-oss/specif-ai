import { IObservabilityProvider } from "./providers/provider.interface";
import { ConsoleProvider } from "./providers/console.provider";
import { LangfuseProvider } from "./providers/langfuse.provider";
import { OBSERVABILITY_PROVIDER } from "../../helper/constants";

export class ProviderFactory {
  static getProvider(): IObservabilityProvider {
    const providerName = process.env.OBSERVABILITY_PROVIDER?.toLowerCase() || OBSERVABILITY_PROVIDER.CONSOLE;
    console.log("process.env", process.env.OBSERVABILITY_PROVIDER?.toLowerCase())
    switch (providerName) {
      case OBSERVABILITY_PROVIDER.LANGFUSE:
        return new LangfuseProvider();
      default:
        return new ConsoleProvider();
    }
  }
}