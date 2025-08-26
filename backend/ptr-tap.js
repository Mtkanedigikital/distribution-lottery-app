const Module = require('module');
const origReq = Module.prototype.require;

Module.prototype.require = function (id) {
  const exp = origReq.apply(this, arguments);
  if (id === 'path-to-regexp') {
    try {
      const wrapped = { ...exp };
      const logArg = (fnName, arg) => {
        let s;
        if (typeof arg === 'string') s = arg;
        else if (arg && arg.path) s = arg.path;
        if (typeof s === 'string') {
          console.error(`[ptr] ${fnName} <- ${JSON.stringify(s.slice(0,200))}`);
        } else {
          console.error(`[ptr] ${fnName} <- <non-string>`);
        }
      };
      // v6 exports: parse, match, tokensToFunction, tokensToRegexp, pathToRegexp
      if (typeof exp.parse === 'function') {
        const orig = exp.parse;
        wrapped.parse = function (arg, ...rest) {
          logArg('parse', arg);
          return orig.call(this, arg, ...rest);
        };
      }
      if (typeof exp.pathToRegexp === 'function') {
        const orig = exp.pathToRegexp;
        wrapped.pathToRegexp = function (arg, ...rest) {
          logArg('pathToRegexp', arg);
          return orig.call(this, arg, ...rest);
        };
      }
      return wrapped;
    } catch (e) {
      console.error('[ptr] wrap error', e && e.message);
      return exp;
    }
  }
  return exp;
};
