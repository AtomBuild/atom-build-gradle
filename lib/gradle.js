'use babel';
'use strict';

function provideBuilder() {

  var fs = require('fs');
  var os = require('os');
  var path = require('path');
  var Promise = require('bluebird');
  var stat = Promise.promisify(fs.stat);
  var exec = Promise.promisify(require('child_process').exec);

  function lineToTask (line) {
    let match = line.match(/^([^\s]+) - .*$/);
    return match ? match[1] : null;
  }

  function taskToConfig(executable, task) {
    return {
      name: 'Gradle: ' + task,
      exec: executable,
      args: [ task ],
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
      let executable;
      return stat(path.join(cwd, 'gradlew')).then(function () {
        executable = path.join(cwd, 'gradlew');
      }).catch(function (err) {
        executable = 'gradle';
      }).then(function () {
        return exec(executable + ' tasks', { cwd: cwd });
      }).then(function (outputBuffer) {
        return outputBuffer
          .toString('utf8')
          .split(os.EOL)
          .map(lineToTask)
          .filter(isFalsy)
          .map(taskToConfig.bind(null, executable));
      });
    }
  };
}

module.exports.provideBuilder = provideBuilder;
