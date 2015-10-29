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

  var errorMatch = [
    '(?<file>/[^:\\n]+\\.java):(?<line>\\d+):',
    '(?::compile(?:Api)?(?:Scala|Java|Groovy))?(?<file>.+):(?<line>\\d+):\\s.+[;:]'
  ];

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
        return outputBuffer
          .toString('utf8')
          .split(os.EOL)
          .map(lineToTask)
          .filter(isFalsy)
          .map(taskToConfig.bind(null, this.executable));
      });
    }
  };
}

module.exports.provideBuilder = provideBuilder;
