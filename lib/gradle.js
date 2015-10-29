'use babel';
'use strict';

function provideBuilder() {

  var fs = require('fs');
  var os = require('os');
  var path = require('path');
  var Promise = require('bluebird');
  var stat = Promise.promisify(fs.stat);
  var exec = Promise.promisify(require('child_process').exec);
  var errorMatch = [
    '(?<file>/[^:\\n]+\\.java):(?<line>\\d+):',
    '(?::compile(?:Api)?(?:Scala|Java|Groovy))?(?<file>.+):(?<line>\\d+):\\s.+[;:]'
  ];

  function lineToTask (line) {
    /* jshint validthis:true */
    if (line.match(/^\w+ tasks$/)) {
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
      return fs.existsSync(path.join(cwd, 'build.gradle'));
    },

    settings: function (cwd) {
      return stat(path.join(cwd, 'gradlew')).bind({}).then(function () {
        this.executable = path.join(cwd, 'gradlew');
      }).catch(function (err) {
        this.executable = 'gradle';
      }).then(function () {
        return exec(this.executable + ' tasks', { cwd: cwd });
      }).then(function (outputBuffer) {
        let lineContext = {
          state: 'idle'
        };
        return outputBuffer
          .toString('utf8')
          .split(os.EOL)
          .map(lineToTask.bind(lineContext))
          .filter(isFalsy)
          .map(taskToConfig.bind(null, this.executable));
      });
    }
  };
}

module.exports.provideBuilder = provideBuilder;
