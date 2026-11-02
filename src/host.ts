import { installNativeUIHost } from '../shared/core/host.js';
import { createTransport, type CordovaBridge } from './transport.js';

const bridge = () => (globalThis as typeof globalThis & { cordova?: CordovaBridge }).cordova;
installNativeUIHost({
  plugin: createTransport(bridge),
  getPlatform: () => bridge()?.platformId ?? 'web',
  isPluginAvailable: (name) =>
    name === 'NativeUI' && typeof bridge()?.exec === 'function' && ['ios', 'android'].includes(bridge()?.platformId ?? ''),
});
