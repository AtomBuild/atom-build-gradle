'use babel';
'use strict';

function provideBuilder() {

  let fs = require('fs');
  let os = require('os');
  let path = require('path');
  let Promise = require('bluebird');
  let stat = Promise.promisify(fs.stat);
  let exec = Promise.promisify(require('child_process').exec);
  let errorMatch = [
    '(?<file>/[^:\\n]+\\.java):(?<line>\\d+):',
    '(?::compile(?:Api)?(?:Scala|Java|Groovy))?(?<file>.+):(?<line>\\d+):\\s.+[;:]'
  ];

  function lineToTask (line) {
    /* jshint validthis:true */
    if (line.match(/^[\w ]+? tasks$/)) {
      this.state = 'header';
      return null;
    }

    if ('header' === this.state && line.match(/^-+$/)) {
      this.state = 'divider';
      return null;
    }

    if (-1 !== [ 'divider', 'task' ].indexOf(this.state)) {
      this.state = 'task';
      let match = line.match(/^([^\s]+).*$/);
      if (!match) {
        this.state = 'idle';
        return null;
      }
      return match[1];
    }
  }

  function taskToConfig(executable, task) {
    return {
      name: 'Gradle: ' + task,
      exec: executable,
      args: [ task ],
      errorMatch: errorMatch,
      sh: false
    };
  }

  function isFalsy (value) {
    return !!value;
  }

  return {
    niceName: 'Gradle',

    isEligable: function (cwd) {
      this.file = path.join(cwd, 'build.gradle');
      return fs.existsSync(this.file);
    },

    settings: function (cwd) {
      let executable;
      this.lastRefresh = new Date();
      return stat(path.join(cwd, 'gradlew')).then(function () {
        executable = path.join(cwd, 'gradlew');
      }).catch(function (err) {
        executable = 'gradle';
      }).then(() => {
        return exec(executable + ' tasks', { cwd: cwd });
      }).then((outputBuffer) => {
        let lineContext = {
          state: 'idle'
        };
        return outputBuffer
          .toString('utf8')
          .split(os.EOL)
          .map(lineToTask.bind(lineContext))
          .filter(isFalsy)
          .map(taskToConfig.bind(null, executable));
      });
    },

    on: function (ev, cb) {
      if ('refresh' !== ev) {
        return;
      }

      this.fileWatcher = fs.watch(this.file, () => {
        if (new Date() - this.lastRefresh < 3000) {
          // Gradle touches the file when it's done, which will trigger this watch to
          // go off again. Require at least 3 second to pass before refreshing.
          return;
        }
        cb();
      });
    },

    off: function(ev) {
      if ('refresh' !== ev) {
        return;
      }

      if (this.fileWatcher) {
        this.fileWatcher.close();
        this.fileWatcher = undefined;
      }
    }
  };
}

module.exports.provideBuilder = provideBuilder;
