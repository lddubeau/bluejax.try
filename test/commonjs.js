/* global __dirname describe it setTimeout before after */
import chai from "chai";
import jsdom from "jsdom";
import { Promise } from "bluebird";
import mockery from "mockery";
import jquery from "jquery";

const assert = chai.assert;

class JSDom {
  constructor(scripts) {
    this.window = undefined;
    this.log_buffer = [];
    this.scripts = scripts;
  }

  create() {
    // vc is useful for debugging.
    const vc = jsdom.createVirtualConsole();
    vc.on("log", console.log); // eslint-disable-line no-console
    vc.on("jsdomError", (err) => {
      throw err;
    });
    return new Promise(
      (resolve, _reject) =>
        jsdom.env({
          html: "",
          url: `file://${__dirname}`,
          features: {
            FetchExternalResources: ["script"],
            ProcessExternalResources: ["script"],
          },
          scripts: this.scripts,
          virtualConsole: vc,
          done: (error, w) => {
            assert.isNull(error, `window creation failed with error: ${error}`);
            this.window = w;
            resolve(this);
          },
        }));
  }
}

// The AMD case is tested above...
describe("loads", () => {
  function checkDefinitions(bluetry) {
    assert.isDefined(bluetry.ajax);
    assert.isDefined(bluetry.make);
  }

  describe("", () => {
    // Alas loading jQuery in a CommonJS environment where there is no window
    // natively is a bit of a mess. jQuery detects the lack of window and
    // exports a constructor that must be called with a window. Here we work
    // around the problem, using Mockery.
    before(() => {
      mockery.enable({
        useCleanCache: true,
        warnOnUnregistered: false,
        warnOnReplace: false,
      });

      const window = jsdom.jsdom("").defaultView;
      mockery.registerMock("jquery", jquery(window));
    });

    after(() => mockery.disable());

    // eslint-disable-next-line global-require
    it("in CommonJS", () => checkDefinitions(require("../index.js")));
  });

  it("through script tags", () =>
     new JSDom([
       "node_modules/jquery/dist/jquery.js",
       "node_modules/bluebird/js/browser/bluebird.js",
       "index.js",
     ]).create().then(jd => checkDefinitions(jd.window.bluejax.try)));
});
