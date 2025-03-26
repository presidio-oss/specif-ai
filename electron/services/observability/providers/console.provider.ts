import { IObservabilityProvider } from "./provider.interface";
export class ConsoleProvider implements IObservabilityProvider {
    createTrace(): any {
      console.log('[ObservabilityManager] Using console logger');
      
      return {
        generation: (params: any) => {
          console.log(`[TRACE] Generation started:`, params.name, params.model);
          return {
            end: (output: any) => console.log(`[TRACE] Generation ended:`, output)
          };
        },
        span: (params: any) => {
          console.log(`[TRACE] Span started:`, params.name);
          return {
            end: (output?: any) => console.log(`[TRACE] Span ended:`, output || '')
          };
        },
        update: (data: any) => console.log(`[TRACE] Update:`, data),
        end: () => console.log(`[TRACE] Trace ended`)
      };
    }
  }
  