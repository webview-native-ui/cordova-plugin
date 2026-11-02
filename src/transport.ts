import type { NativeUIPlugin } from '../shared/core/native/definitions.js';
import type { PluginListenerHandle } from '../shared/core/host.js';

export interface CordovaBridge {
  platformId: string;
  exec(success: (value: any) => void, failure: (error: unknown) => void, service: string, action: string, args: unknown[]): void;
}
export const actions = [
  'configure',
  'coveredSnapshot',
  'completeExtensionAction',
  'getWebViewMetrics',
  'getVerticalBarsGeometry',
  'prepareOverlay',
  'presentOverlay',
  'getConnectionState',
  'dismissOverlay',
  'closeOverlay',
  'stopOverlays',
  'update',
  'setToolbarTransitionProgress',
  'clear',
] as const;
const asError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(typeof error === 'string' ? error : JSON.stringify(error));

/** Cordova callbacks are the only host-specific part of the JavaScript transport. */
export function createTransport(getBridge: () => CordovaBridge | undefined): NativeUIPlugin {
  let nextListener = 0;
  function invoke(action: string, options: unknown = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      const bridge = getBridge();
      if (!bridge) return reject(new Error('Wait for Cordova deviceready before enabling Native UI'));
      bridge.exec(resolve, (error) => reject(asError(error)), 'NativeUI', action, [options]);
    });
  }
  function addListener(eventName: string, listener: (value: any) => void): Promise<PluginListenerHandle> {
    const id = String(++nextListener);
    return new Promise((resolve, reject) => {
      const bridge = getBridge();
      if (!bridge) return reject(new Error('Cordova bridge is unavailable'));
      let removed = false;
      let removal: Promise<void> | undefined;
      bridge.exec(
        (message) => {
          if (message?.type === 'ready') {
            resolve({
              remove: () => {
                removed = true;
                return (removal ??= invoke('removeListener', { id }).then(() => undefined));
              },
            });
          } else if (message?.type === 'event' && !removed) {
            listener(message.data);
          }
        },
        (error) => reject(asError(error)),
        'NativeUI',
        'addListener',
        [{ id, eventName }],
      );
    });
  }
  return {
    ...Object.fromEntries(actions.map((action) => [action, (options?: unknown) => invoke(action, options)])),
    addListener,
  } as NativeUIPlugin;
}
