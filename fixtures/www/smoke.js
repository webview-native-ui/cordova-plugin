document.addEventListener('deviceready', async () => {
  try {
    let taps = 0;
    const history = [];
    window.addEventListener(
      'scroll',
      () => {
        history.push({ t: performance.now(), y: scrollY });
        while (history.length && performance.now() - history[0].t > 1000) history.shift();
      },
      { passive: true },
    );
    document.getElementById('native-action').addEventListener('click', () => {
      document.getElementById('native-count').textContent = `Native taps:${++taps}`;
      const action = taps;
      const start = performance.now();
      const recent = history.filter((sample) => start - sample.t < 500);
      const preDelta = recent.length > 1 ? recent.at(-1).y - recent[0].y : 0;
      const samples = [];
      function sample(now) {
        if (now - start >= 100) samples.push(scrollY);
        if (now - start < 300) requestAnimationFrame(sample);
        else
          document.getElementById('motion').textContent =
            `MOTION:${JSON.stringify({ action, preDelta, lastScrollAgeMs: history.length ? start - history.at(-1).t : null, after100Range: Math.max(...samples) - Math.min(...samples), y: scrollY })}`;
      }
      requestAnimationFrame(sample);
    });
    const bridge = window.NativeUI.NativeUI;
    const configured = await bridge.configure({ stopScrollOnActivate: false });
    const metrics = await bridge.getWebViewMetrics();
    if (typeof configured.supported !== 'boolean' || typeof metrics.radius !== 'number') throw new Error('Invalid native response');
    const disposable = await bridge.addListener('webViewMetricsChange', () => {});
    await disposable.remove();
    const colors = await window.NativeUI.getDynamicColorScheme();
    if (typeof colors.available !== 'boolean' || typeof colors.systemDark !== 'boolean') throw new Error('Invalid Dynamic Color response');
    if (colors.available) {
      for (const mode of ['light', 'dark']) {
        for (const role of ['primary', 'secondary', 'tertiary', 'error', 'surface', 'onSurface']) {
          if (!/^#[0-9a-f]{6}$/i.test(colors[mode]?.[role])) throw new Error(`Invalid ${mode} ${role}`);
        }
      }
    }
    const colorListener = await window.NativeUI.addDynamicColorListener(() => {});
    await colorListener.remove();
    await colorListener.remove();
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
    window.acceptanceHandle = await window.NativeUI.enableNativeUI();
    let changes = 0;
    window.colorSubscription = await window.NativeUI.addDynamicColorListener(() => {
      document.getElementById('color-events').textContent = `Color events:${++changes}`;
    });
    const result = JSON.stringify({ platform: cordova.platformId, configured, metrics, status, colors, reloaded: true });
    document.getElementById('result').textContent = result;
    document.body.dataset.nativeUiSmoke = 'passed';
    console.log(`NATIVE_UI_SMOKE_OK ${result}`);
  } catch (error) {
    document.body.dataset.nativeUiSmoke = 'failed';
    document.getElementById('result').textContent = String(error);
    console.error(`NATIVE_UI_SMOKE_FAILED ${String(error)}`);
  }
});
