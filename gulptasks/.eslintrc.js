module.exports = {
  extends: "lddubeau-base",
  parserOptions: {
    sourceType: "module"
  },
  rules: {
    "import/no-extraneous-dependencies": ["error", {devDependencies: true}],
  }
};
