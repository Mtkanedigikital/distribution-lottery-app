const Module = require('module');
const origRequire = Module.prototype.require;

process.on('uncaughtException', (e) => {
  console.error('[uncaught]', e && (e.stack || e));
  process.exit(1);
});

Module.prototype.require = function (id) {
  const exp = origRequire.apply(this, arguments);
  if (id === 'express') {
    const express = exp;

    const log = (scope, m, first) => {
      let label =
        typeof first === 'string'
          ? `"${first}"`
          : first instanceof RegExp
          ? '<RegExp>'
          : typeof first === 'function'
          ? '<fn>'
          : `<${typeof first}>`;
      try {
        console.log(`[route-reg] ${scope}.${m} ${label}`);
      } catch {}
    };

    // 1) app.* をフック
    const appProto = express.application;
    ['use', 'get', 'post', 'put', 'delete', 'patch', 'all'].forEach((m) => {
      const orig = appProto[m];
      appProto[m] = function (first, ...rest) {
        log('app', m, first);
        return orig.call(this, first, ...rest);
      };
    });

    // 2) router.* もフック
    const origRouter = express.Router;
    express.Router = function (...args) {
      const router = origRouter.apply(this, args);
      ['use', 'get', 'post', 'put', 'delete', 'patch', 'all'].forEach((m) => {
        const orig = router[m];
        router[m] = function (first, ...rest) {
          log('router', m, first);
          return orig.call(this, first, ...rest);
        };
      });
      return router;
    };

    return express;
  }
  return exp;
};
