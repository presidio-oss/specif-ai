export interface IpcRequest {
  channel: string;
  args?: any[];
  skipLoading?: boolean;
  skipWarning?: boolean;
}
