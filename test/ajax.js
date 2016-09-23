/* global window describe it before beforeEach afterEach setTimeout */
import chai from "chai";
import sinon from "sinon";
// This import will work in testing.
// eslint-disable-next-line
import bluetry from "bluejax.try";
import $ from "jquery";

const assert = chai.assert;
const ajax = bluetry.ajax;

describe("", () => {
  let xhr;
  let onLine = true;
  const url = "/base/index.js";
  const something = [200, { "Content-Type": "application/html" }, "something"];
  const error = [500, { "Content-Type": "application/html" }, "error"];

  let nextResponses = [];
  let requests = [];
  before(() => {
    Object.defineProperty(window.navigator.constructor.prototype, "onLine", {
      get: function getOnline() {
        return onLine;
      },
    });
  });

  beforeEach(() => {
    nextResponses = [];
    requests = [];
    xhr = sinon.useFakeXMLHttpRequest();
    xhr.onCreate = (request) => {
      requests.push(request);
      setTimeout(() => {
        const nextResponse = nextResponses.shift();
        if (nextResponse) {
          if (nextResponse === "abort") {
            //
            // We have to set statusText ourselves due to a bug
            // in Sinon 1.17.4.
            //
            // With Sinon 1.17.3 both statusText and readyState had to be set
            // (request.readyState = sinon.FakeXMLHttpRequest.UNSENT).
            //

            request.statusText = "abort";
            request.abort();
          }
          else if (nextResponse === "error") {
            request.abort();
            request.statusText = "error";
          }
          else {
            request.respond(...nextResponse);
          }
        }
      }, 1);
    };

    onLine = true;
  });

  afterEach(() => {
    if (xhr) {
      xhr.restore();
      xhr = null;
    }
  });

  function assertSameKeys(objs, options) {
    const { idFunction, filterBy } = options;
    const getKeys = filterBy ?
            (obj => Object.keys(obj).filter(x => filterBy.indexOf(x) !== -1)) :
            (obj => Object.keys(obj));
    let obj;
    let keys;
    let next = objs[0];
    let nextKeys = getKeys(next);
    let i = 0;
    const limit = objs.length;
    while (i < limit - 1) {
      i++;
      obj = next;
      keys = nextKeys;
      next = objs[i];
      nextKeys = getKeys(next);
      const msg = idFunction ?
              `${idFunction(obj)} differs from ${idFunction(next)}` :
              "";
      assert.sameMembers(keys, nextKeys, msg);
    }
  }

  function assertEqualXhr(wrapper, stock) {
    const names = ["readyState", "status", "statusText", "responseXML",
                   "responseText"];

    for (const name of names) {
      assert.equal(wrapper[name], stock[name], `${name} value differs`);
    }

    assertSameKeys([wrapper, stock], {
      filterBy: ["success", "error", "complete"],
    });
  }

  describe("extractBluejaxOptions", () => {
    it("with three arguments fails", (done) => {
      assert.throws(
        bluetry.extractBluejaxOptions.bind(bluetry, ["http://something", 2, 3]),
        Error,
        /we support 1 or 2 args, got 3/);
      done();
    });

    it("with a single url, no Bluejax options", (done) => {
      const [bluejaxOptions, cleanedOptions] =
              bluetry.extractBluejaxOptions(["http://something"]);
      assert.deepEqual(cleanedOptions, { url: "http://something" });
      assert.deepEqual(bluejaxOptions, {});
      done();
    });

    it("with a settings object, no Bluejax options", (done) => {
      const [bluejaxOptions, cleanedOptions] =
              bluetry.extractBluejaxOptions([{ url: "http://something" }]);
      assert.deepEqual(cleanedOptions, { url: "http://something" });
      assert.deepEqual(bluejaxOptions, {});
      done();
    });

    it("with a settings object, and Bluejax options", (done) => {
      const [bluejaxOptions, cleanedOptions] =
              bluetry.extractBluejaxOptions([{ url: "http://something",
                                               bluejaxOptions: { foo: 1 } }]);
      assert.deepEqual(cleanedOptions, { url: "http://something" });
      assert.deepEqual(bluejaxOptions, { foo: 1 });
      done();
    });

    it("with a url and a settings object, no Bluejax options", (done) => {
      const [bluejaxOptions, cleanedOptions] =
              bluetry.extractBluejaxOptions(["http://something",
                                             { data: "foo" }]);
      assert.deepEqual(cleanedOptions, { url: "http://something",
                                         data: "foo" });
      assert.deepEqual(bluejaxOptions, {});
      done();
    });
  });

  describe("ajax", () => {
    it("should create a wrapper which mirrors the stock jqXHR", (done) => {
      nextResponses.push(something);
      const wrapper = ajax(url);
      nextResponses.push(something);
      const stock = $.ajax(url);
      assertEqualXhr(wrapper, stock);
      wrapper.then(() => {
        stock.then(() => {
          done();
        });
      });
    });

    it("on success we get the same data as with stock jQuery", (done) => {
      nextResponses.push(something);
      const wrapper = ajax(url);
      wrapper.then((data, textStatus, jqXHR) => {
        assert.equal(wrapper, jqXHR);
        nextResponses.push(something);
        $.ajax(url).then((jqdata, jqtextStatus, jqjqXHR) => {
          assert.equal(data, jqdata);
          assert.equal(textStatus, jqtextStatus);
          assertEqualXhr(jqXHR, jqjqXHR);
          done();
        });
      });
    });

    it("should reject immediately if tries is unspecified", (done) => {
      xhr.restore();
      xhr = null;

      // Force the requests to fail.
      const stub = sinon.stub(window.XMLHttpRequest.prototype, "open");
      stub.throws();
      const wrapper = ajax(url);
      wrapper.fail((jqXHR, textStatus, thrownError) => {
        assert.equal(wrapper, jqXHR);
        assert.equal(textStatus, "error");
        assert.isTrue(thrownError instanceof Error);
        assert.equal(stub.callCount, 1);
      }).always(() => {
        stub.restore();
        done();
      });
    });

    it("should reject immediately on HTTP errors", (done) => {
      nextResponses = [error];
      const wrapper = ajax(url, {
        bluejaxOptions: {
          tries: 3,
          delay: 10,
        },
      });
      wrapper.fail((jqXHR, textStatus, thrownError) => {
        assert.equal(wrapper, jqXHR);
        assert.equal(textStatus, "error");
        assert.equal(thrownError, "Internal Server Error");
        assert.equal(requests.length, 1);
        done();
      });
    });

    it("should retry on timeouts", (done) => {
      const wrapper = ajax(url, { timeout: 10,
                                  bluejaxOptions: {
                                    tries: 3,
                                    delay: 10,
                                  },
                                });
      wrapper.fail((jqXHR, textStatus, thrownError) => {
        assert.equal(wrapper, jqXHR);
        assert.equal(textStatus, "timeout");
        assert.equal(thrownError, "timeout");
        assert.equal(requests.length, 3);
        done();
      });
    });

    it("should reject immediately when aborting", (done) => {
      nextResponses = ["abort"];
      const wrapper = ajax(url, {
        bluejaxOptions: {
          tries: 3,
          delay: 10,
        },
      });
      wrapper.fail((jqXHR, textStatus, thrownError) => {
        assert.equal(wrapper, jqXHR);
        assert.equal(textStatus, "abort");
        assert.equal(thrownError, "abort");
        assert.equal(requests.length, 1);
        done();
      });
    });

    it("should reject immediately when there is a parsing error", (done) => {
      nextResponses = [[200, { "Content-Type": "text/json" }, "</q>"]];
      const wrapper = ajax(url, { dataType: "json",
                                  bluejaxOptions: {
                                    tries: 3,
                                    delay: 10,
                                  },
                                });
      wrapper.fail((jqXHR, textStatus, thrownError) => {
        assert.equal(wrapper, jqXHR);
        assert.equal(textStatus, "parsererror");
        assert.isTrue(thrownError instanceof SyntaxError);
        assert.equal(requests.length, 1);
        done();
      });
    });

    it("should retry when requested and retrying can happen", (done) => {
      xhr.restore();
      xhr = null;

      // Force the requests to fail.
      const stub = sinon.stub(window.XMLHttpRequest.prototype, "open");
      stub.throws();
      const wrapper = ajax("http://example.com:80", {
        bluejaxOptions: {
          tries: 3,
          delay: 10,
        },
      });
      wrapper.fail((jqXHR) => {
        assert.equal(wrapper, jqXHR);
        assert.equal(stub.callCount, 3);
      })
        .always(() => {
          stub.restore();
          done();
        });
    });

    it("should use the shouldRetry option to decide to retry", (done) => {
      xhr.restore();
      xhr = null;

      // Force the requests to fail.
      const stub = sinon.stub(window.XMLHttpRequest.prototype, "open");
      stub.throws();
      const shouldRetry = sinon.stub();
      shouldRetry.returns = false;
      ajax("http://example.com:80", {
        bluejaxOptions: {
          tries: 3,
          delay: 10,
          shouldRetry,
        },
      }).always(() => {
        assert.equal(stub.callCount, 1);
        assert.equal(shouldRetry.callCount, 1);
        stub.restore();
        done();
      });
    });

    it("should produce an xhr that warns when it is modified", (done) => {
      /* eslint-disable no-console */
      sinon.stub(console, "warn");
      nextResponses.push(something);
      const wrapper = ajax("http://example.com:80");
      wrapper.setRequestHeader("foo");
      assert.equal(console.warn.callCount, 1);
      wrapper.overrideMimeType("foo");
      assert.equal(console.warn.callCount, 2);
      wrapper.statusCode(1);
      assert.equal(console.warn.callCount, 3);
      console.warn.restore();
      wrapper.then(() => done());
    });

    it("should produce an xhr that allows getting headers", (done) => {
      nextResponses.push(something);
      const wrapper = ajax("http://example.com:80");
      wrapper.then(() => {
        assert.equal(wrapper.getResponseHeader("Content-Type"),
                     "application/html");
        assert.equal(wrapper.getAllResponseHeaders(),
                     "Content-Type: application/html\r\n");
        done();
      });
    });

    it("should produce an xhr that allows aborting", (done) => {
      // We cannot use Sinon's fake XHR for this, because its
      // support for abbort is defficient.
      xhr.restore();
      xhr = null;

      const spy = sinon.spy(window.XMLHttpRequest.prototype, "open");
      const wrapper = ajax("http://example.com:80");
      wrapper.abort();
      wrapper.fail((jqXHR, textStatus, thrownError) => {
        assert.equal(wrapper, jqXHR);
        assert.equal(textStatus, "abort");
        assert.equal(thrownError, "abort");
        assert.equal(spy.calledOnce, 1);
        spy.restore();
        done();
      });
    });

    it("supports statusCode", (done) => {
      nextResponses.push(something);
      const context = { foo: 1 };
      const spy = sinon.spy();
      const wrapper = ajax("http://example.com:80", {
        context,
        statusCode: {
          200: spy,
        },
      });
      wrapper.then(() => {
        // The handling of statusCode happens *after* the promise
        // has been resolved so we need to wait a bit.
        setTimeout(() => {
          assert.equal(spy.callCount, 1);
          assert.isTrue(spy.calledOn(context),
                        "the handler should be called witht the right context");
          done();
        }, 0);
      });
    });

    it("supports success", (done) => {
      nextResponses.push(something);
      const context = { foo: 1 };
      const spy = sinon.spy();
      const wrapper = ajax("http://example.com:80", {
        context,
        success: spy,
      });
      wrapper.then(() => {
        assert.equal(spy.callCount, 1);
        assert.isTrue(spy.calledOn(context),
                      "the handler should be called witht the right context");
        done();
      });
    });

    it("supports error", (done) => {
      nextResponses.push(error);
      const context = { foo: 1 };
      const spy = sinon.spy();
      const wrapper = ajax("http://example.com:80", {
        context,
        error: spy,
      });
      wrapper.fail(() => {
        assert.equal(spy.callCount, 1);
        assert.isTrue(spy.calledOn(context),
                      "the handler should be called witht the right context");
        done();
      });
    });

    it("support a statusCode without the matching status", (done) => {
      nextResponses.push(something);
      const wrapper = ajax("http://example.com:80", {
        statusCode: {
        },
      });
      wrapper.then(() => {
        // The handling of statusCode happens *after* the promise
        // has been resolved so we need to wait a bit.
        setTimeout(() => {
          done();
        }, 0);
      });
    });
  });

  describe("make", () => {
    it("sets options", (done) => {
      xhr.restore();
      xhr = null;

      // Force the requests to fail.
      const stub = sinon.stub(window.XMLHttpRequest.prototype, "open");
      stub.throws();
      const custom = bluetry.make({ tries: 3 });
      custom("http://example.com:80").fail(() => {
        assert.equal(stub.callCount, 3, "there should be three requests");
        done();
      });
    });
  });
});
