import { IObservabilityManager } from "./observability.interface";
import { ProviderFactory } from "./provider.factory";

export class ObservabilityManager implements IObservabilityManager {
  private static instance: ObservabilityManager;
  private trace: any;

  private constructor() {
    const provider = ProviderFactory.getProvider();
    this.trace = provider.createTrace();
  }

  public static getInstance(): ObservabilityManager {
    if (!ObservabilityManager.instance) {
      ObservabilityManager.instance = new ObservabilityManager();
    }
    return ObservabilityManager.instance;
  }

  public getTrace(): any {
    return this.trace;
  }
}
