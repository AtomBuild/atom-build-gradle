'use babel';
'use strict';

function provideBuilder() {

  var fs = require('fs');
  var path = require('path');

  var errorMatch = ['(?::compile(?:Api)?(?:Scala|Java|Groovy))?(?<file>.+):(?<line>\\d+):\\s.+[;:]'];

  return {
    niceName: 'Gradle',

    isEligable: function (cwd) {
      return fs.existsSync(path.join(cwd, 'build.gradle'));
    },

    settings: function (cwd) {
      return [
        {
          name: 'Gradle: assemble',
          exec: 'gradle',
          sh: false,
          args: [ 'assemble' ],
          errorMatch: errorMatch
        },
        {
          name: 'Gradle: check',
          exec: 'gradle',
          sh: false,
          args: [ 'check' ],
          errorMatch: errorMatch
        }
      ];
    }
  };
}

module.exports.provideBuilder = provideBuilder;
