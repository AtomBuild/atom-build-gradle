'use babel';
'use strict';

import { existsSync, stat, statSync, watch } from 'fs';
import os from 'os';
import path from 'path';
import Promise from 'bluebird';
import { exec } from 'child_process';

function provideBuilder() {
  const statAsync = Promise.promisify(stat);
  const execAsync = Promise.promisify(exec);
  const errorMatch = [
    '(?<file>/[^:\\n]+\\.java):(?<line>\\d+):',
    '(?::compile(?:Api)?(?:Scala|Java|Groovy))?(?<file>.+):(?<line>\\d+):\\s.+[;:]'
  ];

  function lineToTask(line) {
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
      const match = line.match(/^([^\s]+).*$/);
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

  function isFalsy(value) {
    return !!value;
  }

  return {
    niceName: 'Gradle',

    isEligable: function (cwd) {
      this.file = path.join(cwd, 'build.gradle');
      return existsSync(this.file);
    },

    settings: function (cwd) {
      let executable;
      this.lastRefresh = new Date();
      return statAsync(path.join(cwd, 'gradlew')).then(function () {
        executable = path.join(cwd, 'gradlew');
      }).catch(function (err) {
        executable = 'gradle';
      }).then(() => {
        return execAsync(executable + ' tasks', { cwd: cwd });
      }).then((outputBuffer) => {
        const lineContext = {
          state: 'idle'
        };
        return outputBuffer
          .toString('utf8')
          .split(os.EOL)
          .map(lineToTask.bind(lineContext))
          .filter(isFalsy)
          .map(taskToConfig.bind(null, executable));
      }).catch((e) => console.error(e.stack));
    },

    on: function (ev, cb) {
      if ('refresh' !== ev) {
        return;
      }

      this.fileWatcher = watch(this.file, () => {
        if (new Date() - this.lastRefresh < 3000) {
          // Gradle touches the file when it's done, which will trigger this watch to
          // go off again. Require at least 3 second to pass before refreshing.
          return;
        }
        cb();
      });
    },

    off: function (ev) {
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
