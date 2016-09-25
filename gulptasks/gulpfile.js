/* global __dirname */
import "babel-polyfill";
import gulp from "gulp";
import { Server } from "karma";
import uglify from "gulp-uglify";
import rename from "gulp-rename";
import del from "del";
import Promise from "bluebird";
import _fs from "fs-extra";
import _child_process from "child_process"; // eslint-disable-line camelcase
import gutil from "gulp-util";
import eslint from "gulp-eslint";
import sourcemaps from "gulp-sourcemaps";
import { ArgumentParser } from "argparse";

// eslint-disable-next-line camelcase
const child_process = Promise.promisifyAll(_child_process);
const execFileAsync = child_process.execFileAsync;

const fs = Promise.promisifyAll(_fs);

function exec(command, options) {
  return new Promise((resolve, reject) => {
    child_process.exec(command, options, (err, stdout, stderr) => {
      if (err) {
        gutil.log(stdout);
        gutil.log(stderr);
        reject(err);
      }
      resolve([stdout, stderr]);
    });
  });
}

function spawn(cmd, args, options) {
  return new Promise((resolve, reject) => {
    const child = child_process.spawn(cmd, args || [], options || {});
    child.on("exit", (code, signal) => {
      if (code) {
        reject(new Error(`child terminated with code: ${code}`));
        return;
      }

      if (signal) {
        reject(new Error(`child terminated with signal: ${signal}`));
        return;
      }

      resolve();
    });
  });
}

const parser = new ArgumentParser({ addHelp: true });

// We have this here so that the help message is more useful than
// without. At the same time, this positional argument is not
// *required*.
parser.addArgument(["target"], {
  help: "Target to execute.",
  nargs: "?",
  defaultValue: "default",
});

parser.addArgument(["--browsers"], {
  help: "Set which browsers to use.",
  nargs: "+",
});

const globalOptions = parser.parseArgs(process.argv.slice(2));

gulp.task("lint", () =>
          gulp.src(["*.js", "test/**/*.js", "gulptasks/**/*.js"])
            .pipe(eslint())
            .pipe(eslint.format())
            .pipe(eslint.failAfterError()));

gulp.task("default", ["uglify"], () =>
          gulp.src("index.js")
          .pipe(rename("bluejax.try.js"))
          .pipe(gulp.dest("dist")));

gulp.task("uglify", ["lint"], () =>
          gulp.src("index.js")
            .pipe(sourcemaps.init())
            .pipe(uglify({
              preserveComments: "license",
            }))
            .pipe(rename("bluejax.try.min.js"))
            // Writing to . prevents inlining the map.
            .pipe(sourcemaps.write("."))
            .pipe(gulp.dest("dist")));

function runTest(version) {
  gutil.log(`Testing against jquery@${version}...`);
  const args = [];
  if (globalOptions.browsers) {
    args.push("--browsers", globalOptions.browsers.join(" "));
  }
  return exec(`npm install jquery@${version}`).then(
    () => spawn("gulp", ["_test"].concat(args), {
      stdio: "inherit",
    }));
}

const jqueryVersions = ["1.11", "1.12", "2", "3"];

for (const version of jqueryVersions) {
  gulp.task(`test-with-jquery-${version}`, () => runTest(version));
}

gulp.task("test", () => Promise.each(jqueryVersions, runTest));

gulp.task("_test", ["semver", "test-mocha", "test-karma"]);

gulp.task("semver",
          () => execFileAsync("./node_modules/.bin/semver-sync", ["-v"]));

gulp.task("test-mocha", () =>
          exec("./node_modules/.bin/istanbul cover " +
            "--dir ./coverage/mocha --report lcov --report json " +
            "node_modules/.bin/_mocha ./test/commonjs.js"));

gulp.task("test-karma", (done) => {
  new Server({
    configFile: `${__dirname}/../karma.conf.js`,
    singleRun: true,
    browsers: globalOptions.browsers,
  }, done).start();
});

gulp.task("pack", ["default"], Promise.coroutine(function *distTask() {
  yield fs.ensureDirAsync("pack");
  yield exec("ln -sf `npm pack ..` LATEST-DIST.tgz", { cwd: "pack" });
  // Test that the package can actually be installed.
  yield del("pack/t");
  yield fs.ensureDirAsync("pack/t/node_modules");
  yield exec("(cd pack/t; npm install ../LATEST-DIST.tgz)");
  yield del("pack/t");
}));

gulp.task("clean", () => del(["dist", "pack"]));
