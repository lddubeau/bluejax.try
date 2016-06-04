const allTestFiles = [];
const TEST_REGEXP = /test\/(?!karma-main).*\.js$/i;

Object.keys(window.__karma__.files).forEach((file) => {
  if (TEST_REGEXP.test(file)) {
    const normalizedTestModule = file.replace(/^\/base\/|\.js$/g, "");
    allTestFiles.push(normalizedTestModule);
  }
});

require.config({
  baseUrl: "/base",
  paths: {
    jquery: "node_modules/jquery/dist/jquery",
    "bluejax.try": "index",
    chai: "node_modules/chai/chai",
    sinon: "node_modules/sinon/lib/sinon",
  },
  deps: allTestFiles,
  callback: window.__karma__.start,
});
