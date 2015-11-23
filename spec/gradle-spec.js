'use babel';

import fs from 'fs-extra';
import temp from 'temp';
import { vouch } from 'atom-build-spec-helpers';
import { provideBuilder } from '../lib/gradle';

describe('gradle', () => {
  let directory;
  const builder = provideBuilder();

  beforeEach(() => {
    waitsForPromise(() => {
      return vouch(temp.mkdir, 'atom-build-gradle-spec-')
        .then((dir) => vouch(fs.realpath, dir))
        .then((dir) => vouch(fs.copy, __dirname + '/fixture/wrapper', directory = `${dir}/`));
    });
  });

  afterEach(() => {
    fs.removeSync(directory);
  });

  describe('build.gradle file exists', () => {
    it('should be eligible', () => {
      waitsForPromise(() => {
        const file = __dirname + '/fixture/build.gradle';
        return vouch(fs.copy, file, directory + '/build.gradle');
      });

      runs(() => {
        expect(builder.isEligable(directory)).toEqual(true);
      });
    });

    it('should resolve tasks in settings', () => {
      waitsForPromise(() => {
        const file = __dirname + '/fixture/build.gradle';
        return vouch(fs.copy, file, directory + '/build.gradle');
      });

      waitsForPromise(() => {
        return builder.settings(directory).then((settings) => {
          const targets = settings.map(s => s.name);
          const atLeast = [ 'Gradle: init', 'Gradle: wrapper', 'Gradle: dependencies', 'Gradle: help', 'Gradle: wheelOfTime' ];
          const missing = atLeast.filter((e) => targets.indexOf(e) === -1);
          expect(missing.length).toEqual(0);
        });
      });
    });

    describe('build.gradle file does not exist', () => {
      it('should not be eligible', () => {
        expect(builder.isEligable(directory)).toEqual(false);
      });
    });
  });
});
