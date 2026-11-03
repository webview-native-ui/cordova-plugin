document.addEventListener('deviceready', async () => {
  try {
    const bridge = window.NativeUI.NativeUI;
    const configured = await bridge.configure();
    const metrics = await bridge.getWebViewMetrics();
    if (typeof configured.supported !== 'boolean' || typeof metrics.radius !== 'number') throw new Error('Invalid native response');
    const disposable = await bridge.addListener('webViewMetricsChange', () => {});
    await disposable.remove();
    await disposable.remove();
    // Deliberately leave one callback alive: onReset must release it before reload.
    await bridge.addListener('snapshotInteraction', () => {});
    await bridge.clear({ revision: 1 });
    const handle = await window.NativeUI.enableNativeUI();
    const status = handle.getStatus();
    if (!['native', 'web'].includes(status.state)) throw new Error(`Unexpected public API status: ${status.state}`);
    await handle.destroy();
    const invalidRejected = await new Promise((resolve) =>
      cordova.exec(
        () => resolve(false),
        () => resolve(true),
        'NativeUI',
        'addListener',
        [{ id: 'invalid', eventName: 'invalid' }],
      ),
    );
    if (!invalidRejected) throw new Error('Invalid listener unexpectedly succeeded');
    if (!sessionStorage.getItem('native-ui-reloaded')) {
      sessionStorage.setItem('native-ui-reloaded', 'true');
      location.reload();
      return;
    }
    const result = JSON.stringify({ platform: cordova.platformId, configured, metrics, status, reloaded: true });
    document.getElementById('result').textContent = result;
    document.body.dataset.nativeUiSmoke = 'passed';
    console.log(`NATIVE_UI_SMOKE_OK ${result}`);
  } catch (error) {
    document.body.dataset.nativeUiSmoke = 'failed';
    document.getElementById('result').textContent = String(error);
    console.error(`NATIVE_UI_SMOKE_FAILED ${String(error)}`);
  }
});
