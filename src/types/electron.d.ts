export interface IElectronAPI {
  sendDataRequest: (channel: string, data: any) => void;
  onDataResponse: (channel: string, func: (...args: any[]) => void) => (() => void) | undefined;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
