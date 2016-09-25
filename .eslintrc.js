module.exports = {
  extends: [
    "lddubeau-base/es5"
  ],
  rules: {
    "import/no-extraneous-dependencies":
    ["error", {devDependencies: ["**/karma.conf.js"]}],
  }
};
