let _handler = null;

export function registerToastHandler(fn) {
  _handler = fn;
}

export function unregisterToastHandler() {
  _handler = null;
}

export function showToast(message, options = {}) {
  if (_handler) {
    _handler(message, options);
  } else {
    // No handler registered (app not mounted) - do nothing
    // We avoid importing Alert here to keep this module tiny; callers may fallback
    console.warn('Toast handler not registered:', message);
  }
}
