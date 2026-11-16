import { beforeEach, describe, expect, it, vi } from 'vitest';

const host = vi.hoisted(() => ({
  nativeUIHost: { getPlatform: vi.fn(() => 'android') },
  nativeUIPlugin: { getDynamicColorScheme: vi.fn(), addListener: vi.fn() },
}));
vi.mock('../shared/core/host.js', () => host);
import { addDynamicColorListener, getDynamicColorScheme } from '../shared/dynamic-colors.js';

describe('Cordova Dynamic Color API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    host.nativeUIHost.getPlatform.mockReturnValue('android');
  });
  it('preserves the native availability and both schemes on Android', async () => {
    const scheme = { available: true, systemDark: false, light: { primary: '#123456' }, dark: { primary: '#654321' } };
    host.nativeUIPlugin.getDynamicColorScheme.mockResolvedValue(scheme);
    await expect(getDynamicColorScheme()).resolves.toBe(scheme);
    expect(host.nativeUIPlugin.getDynamicColorScheme).toHaveBeenCalledOnce();
  });
  it('returns the system appearance without invoking native colors on other platforms', async () => {
    host.nativeUIHost.getPlatform.mockReturnValue('ios');
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    try {
      await expect(getDynamicColorScheme()).resolves.toEqual({ available: false, systemDark: true });
      expect(host.nativeUIPlugin.getDynamicColorScheme).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it('returns the removable native event subscription on Android', async () => {
    const handle = { remove: vi.fn() };
    const listener = vi.fn();
    host.nativeUIPlugin.addListener.mockResolvedValue(handle);
    expect(await addDynamicColorListener(listener)).toBe(handle);
    expect(host.nativeUIPlugin.addListener).toHaveBeenCalledWith('dynamicColorSchemeChange', listener);
    host.nativeUIHost.getPlatform.mockReturnValue('web');
    await (await addDynamicColorListener(listener)).remove();
    expect(host.nativeUIPlugin.addListener).toHaveBeenCalledOnce();
  });
});
