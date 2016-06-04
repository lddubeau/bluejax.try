/* global module */
module.exports = function configure(config) {
  "use strict";
  config.set({
    basePath: "",
    frameworks: ["requirejs", "mocha"],
    files: [
      "test/karma-main.js",
      { pattern: "index.js", included: false },
      { pattern: "test/**/!(commonjs).js", included: false },
      { pattern: "node_modules/jquery/dist/jquery.js", included: false },
      { pattern: "node_modules/chai/chai.js", included: false },
      { pattern: "node_modules/sinon/lib/**/*.js", included: false },
    ],
    exclude: [
    ],
    client: {
      mocha: {
        asyncOnly: true,
      },
    },
    preprocessors: {
      "test/**/!(karma-main).js": ["babelModule"],
      "test/karma-main.js": ["babel"],
      "index.js": ["coverage"],
    },
    customPreprocessors: {
      babelModule: {
        base: "babel",
        options: {
          plugins: ["transform-es2015-modules-amd"],
        },
      },
    },
    babelPreprocessor: {
      options: {
        presets: ["es2015"],
        sourceMap: "inline",
      },
      filename: function filename(file) {
        return file.originalPath.replace(/\.js$/, ".es5.js");
      },
      sourceFileName: function sourceFileName(file) {
        return file.originalPath;
      },
    },
    reporters: ["progress", "coverage"],
    coverageReporter: {
      reporters: [
        { type: "html" },
        { type: "json" },
      ],
    },
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: false,
    browsers: ["Chrome", "Firefox"],
    singleRun: false,
  });
};
