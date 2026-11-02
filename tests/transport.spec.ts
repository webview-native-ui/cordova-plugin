import { describe, expect, it, vi } from 'vitest';
import { createTransport, type CordovaBridge } from '../src/transport';

function fixture() {
  const exec = vi.fn<CordovaBridge['exec']>();
  const plugin = createTransport(() => ({ platformId: 'ios', exec }));
  return { exec, plugin };
}
describe('Cordova transport', () => {
  it('sends typed options to the NativeUI service and preserves native results/errors', async () => {
    const { exec, plugin } = fixture();
    const pending = plugin.configure({ suppressScrollEdgeEffect: true });
    const [success, , service, action, args] = exec.mock.calls[0];
    expect([service, action, args]).toEqual(['NativeUI', 'configure', [{ suppressScrollEdgeEffect: true }]]);
    success({ supported: true, extensions: ['fixture'] });
    await expect(pending).resolves.toEqual({ supported: true, extensions: ['fixture'] });
    const failed = plugin.getWebViewMetrics();
    exec.mock.calls[1][1]('native failure');
    await expect(failed).rejects.toThrow('native failure');
  });
  it('waits for listener registration and releases a kept callback once', async () => {
    const { exec, plugin } = fixture();
    const listener = vi.fn();
    const pending = plugin.addListener('activate', listener);
    const [message, , service, action, args] = exec.mock.calls[0];
    expect([service, action, args]).toEqual(['NativeUI', 'addListener', [{ id: '1', eventName: 'activate' }]]);
    message({ type: 'ready' });
    const handle = await pending;
    message({ type: 'event', data: { id: 'button', revision: 1, sequence: 1 } });
    expect(listener).toHaveBeenCalledWith({ id: 'button', revision: 1, sequence: 1 });
    const removal = handle.remove();
    expect(handle.remove()).toBe(removal);
    message({ type: 'event', data: { id: 'late' } });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(exec.mock.calls[1].slice(2)).toEqual(['NativeUI', 'removeListener', [{ id: '1' }]]);
    exec.mock.calls[1][0]({});
    await removal;
    const other = plugin.addListener('search', vi.fn());
    expect(exec.mock.calls[2][4]).toEqual([{ id: '2', eventName: 'search' }]);
    exec.mock.calls[2][1]('registration failed');
    await expect(other).rejects.toThrow('registration failed');
  });
  it('removes registrations that become ready after the caller starts tearing down', async () => {
    const { exec, plugin } = fixture();
    const pending = plugin.addListener('overlay', vi.fn());
    const cleanup = pending.then((handle) => handle.remove());
    exec.mock.calls[0][0]({ type: 'ready' });
    await Promise.resolve();
    expect(exec.mock.calls[1].slice(2)).toEqual(['NativeUI', 'removeListener', [{ id: '1' }]]);
    exec.mock.calls[1][0]({});
    await cleanup;
  });
  it('rejects commands without a Cordova bridge instead of leaving promises pending', async () => {
    const plugin = createTransport(() => undefined);
    await expect(plugin.getWebViewMetrics()).rejects.toThrow('deviceready');
    await expect(plugin.addListener('activate', vi.fn())).rejects.toThrow('unavailable');
  });
});
