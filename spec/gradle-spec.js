'use babel';
'use strict';

let fs = require('fs-extra');
let temp = require('temp');
let specHelpers = require('atom-build-spec-helpers');

describe('Build', function() {
  let directory;
  let workspaceElement;

  beforeEach(() => {
    workspaceElement = atom.views.getView(atom.workspace);
    jasmine.attachToDOM(workspaceElement);
    jasmine.unspy(window, 'setTimeout');
    jasmine.unspy(window, 'clearTimeout');

    waitsForPromise(() => {
      return specHelpers.vouch(temp.mkdir, 'atom-build-gradle-spec-')
        .then((dir) => specHelpers.vouch(fs.realpath, dir))
        .then((dir) => atom.project.setPaths([ (directory = dir + '/') ]))
        .then(() => {
          return Promise.all([
            specHelpers.vouch(fs.copy, __dirname + '/fixture/wrapper', directory),
            atom.packages.activatePackage('build'),
            atom.packages.activatePackage('build-gradle')
          ]);
        })
        .then(() => console.log(directory));
    });
  });

  afterEach(() => {
    console.log(directory);
    // fs.removeSync(directory);
  });

  describe('build.gradle file exists', () => {
    it('should make those targets available', () => {
      waitsForPromise(function () {
        let file = __dirname + '/fixture/build.gradle';
        return specHelpers.vouch(fs.copy, file, directory + '/build.gradle')
          .then(() => specHelpers.refreshAwaitTargets());
      });

      runs(() => atom.commands.dispatch(workspaceElement, 'build:select-active-target'));

      waitsFor(() => workspaceElement.querySelector('.select-list li.build-target'));

      runs(() => {
        let targets = [...workspaceElement.querySelectorAll('.select-list li.build-target')].map(el => el.textContent);
        let atLeast = [ 'Gradle: init', 'Gradle: wrapper', 'Gradle: dependencies', 'Gradle: help', 'Gradle: wheelOfTime' ];
        let missing = atLeast.filter((e) => targets.indexOf(e) === -1);
        expect(missing.length).toEqual(0);
      });
    });

    it('should be possible to run a custom task defined in a gradle file', () => {
      waitsForPromise(function () {
        let file = __dirname + '/fixture/build.gradle';
        return specHelpers.vouch(fs.copy, file, directory + '/build.gradle')
          .then(() => specHelpers.refreshAwaitTargets());
      });

      runs(() => atom.commands.dispatch(workspaceElement, 'build:select-active-target'));

      waitsFor(() => workspaceElement.querySelector('.select-list li.build-target'));

      runs(() => {
        let targets = [...workspaceElement.querySelectorAll('.select-list li.build-target')];
        targets.find((t) => t.innerHTML === 'Gradle: wheelOfTime').click();
        atom.commands.dispatch(workspaceElement, 'build:trigger');
      });

      waitsFor(function() {
        return workspaceElement.querySelector('.build .title') &&
          workspaceElement.querySelector('.build .title').classList.contains('success');
      });

      runs(function() {
        expect(workspaceElement.querySelector('.build')).toExist();
        expect(workspaceElement.querySelector('.build .output').textContent).toMatch(/The Wheel of Time turns, and Ages come and pass, leaving memories that become legend\./);
      });
    });
  });
});
