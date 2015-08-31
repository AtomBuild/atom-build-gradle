'use babel';
'use strict';

function provideBuilder() {

  var fs = require('fs');
  var path = require('path');

  return {
    niceName: 'Gradle',

    isEligable: function (cwd) {
      return fs.existsSync(path.join(cwd, 'build.gradle'));
    },

    settings: function (cwd) {
      return [
        {
          name: 'Gradle: build',
          exec: 'gradle',
          args: [ 'build' ]
        }
      ];
    }
  };
}

module.exports.provideBuilder = provideBuilder;
