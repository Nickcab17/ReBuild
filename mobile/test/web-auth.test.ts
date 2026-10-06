import assert from 'node:assert/strict';
import test from 'node:test';
import { clearLegacyDemoStorage } from '../data/webAuth';

test('legacy publication data is cleared only outside local demo mode', () => {
  const removedKeys: string[] = [];
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage: { removeItem: (key: string) => removedKeys.push(key) } },
  });

  try {
    clearLegacyDemoStorage();
    assert.deepEqual(removedKeys, ['rebuild.web.accounts', 'rebuild.web.session']);

    removedKeys.length = 0;
    clearLegacyDemoStorage(true);
    assert.deepEqual(removedKeys, [
      'rebuild.web.accounts',
      'rebuild.web.session',
      'rebuild.web.publications',
    ]);
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});
