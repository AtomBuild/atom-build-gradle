'use babel';
'use strict';

function provideBuilder() {

  var fs = require('fs');
  var path = require('path');

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
      let gradlew = path.join(cwd, 'gradlew');
      return new Promise(function(resolve, reject) {
        fs.stat(gradlew, function (err, stat) {
          let exec = err ? 'gradle' : gradlew;
          resolve([
            {
              name: 'Gradle: assemble',
              exec: exec,
              sh: false,
              args: [ 'assemble' ],
              errorMatch: errorMatch
            },
            {
              name: 'Gradle: check',
              exec: exec,
              sh: false,
              args: [ 'check' ],
              errorMatch: errorMatch
            }
          ]);
        });
      });
    }
  };
}

module.exports.provideBuilder = provideBuilder;
