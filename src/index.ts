#!/usr/bin/env node
// 1 - cli bin dependencies
import _ from 'lodash';
import yaml from 'yaml';
import yargs from 'yargs';
import shell from 'shelljs';
import { glob } from 'glob';
import { exit } from 'process';
import deepmerge from 'deepmerge';
import { list } from 'wild-wild-path';
import { hideBin } from 'yargs/helpers';
import { resolve, dirname, relative, join } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';

import { parseTags } from './tags';
import { CliArgsType } from './types';

// get all provided arguments
const args = yargs(hideBin(process.argv)).argv as unknown as CliArgsType;
const errors: Array<string> = [];

// // validte required arguments
// if (!args.file) {
//   errors.push('--file argument required');
// }

// exit error if exists some validation error
if (errors.length > 0) {
  console.error(errors);
  exit(1);
}

// execute cli function
(async () => {
  try {
    // 1) try to access specific sls filename provided by args or serverless.yml by default
    let filename = args.file ?? 'serverless.yml';
    if (!existsSync(resolve(__dirname, filename))) filename = 'serverless-compose.yml';
    if (!existsSync(resolve(__dirname, filename))) throw new Error('serverless file not provided');

    // 2) get basepath from filename with resolve dirname
    const rootpath = dirname(resolve(__dirname, filename));

    // 2) get .env path (if exists) to be copied on each service build
    let dotenv: string | undefined = resolve(rootpath, args.dotenv ?? '.env');
    if (!existsSync(dotenv)) dotenv = undefined;

    // 3) convert serverless (single sls) to array, or capture sls files on serverless-compose paths as array
    const data = readFileSync(resolve(rootpath, filename), { encoding: 'binary' });
    const json = yaml.parse(data);
    const paths: string[] = [];
    if (_.has(json, 'service')) paths.push(resolve(rootpath));
    if (_.has(json, 'services')) {
      for (const service of Object.values(json.services)) {
        if (!_.has(service, 'path') || typeof _.get(service, 'path') !== 'string') continue;
        paths.push(resolve(rootpath, String(_.get(service, 'path'))));
      }
    }

    // 4) throws an error if no service wast defined
    if (paths.length === 0) throw new Error('no serverless services founded');

    // 5) for each path, create a build-(tmp-hash) folder to store files to build
    for (const servicepath of paths) {
      // load service json
      const servicefile = resolve(servicepath, 'serverless.yml');
      const servicedata = readFileSync(servicefile, { encoding: 'binary' });
      let servicejson = yaml.parse(servicedata, { customTags: parseTags });

      // clean build file before starting build
      await shell.exec(`rm ${resolve(servicepath, 'serverless.build.yml')}`);

      // iterate all modules of current service
      // * ignore other service folder (even child/subchild)
      const modules = await glob(servicepath + '/**/*.m.yml', {
        ignore: paths
          .filter((path) => path.startsWith(servicepath) && path !== servicepath)
          .map((path) => `${path}/**`),
      });
      for (const module of modules) {
        const moduledata = readFileSync(module, { encoding: 'binary' });
        const modulejson = yaml.parse(moduledata, { customTags: parseTags });

        // get the diff path between servicepath and modulepath
        const diffpath = join(servicepath, relative(servicepath, dirname(module)));

        // check each module file for configs with related paths
        // and adjust its pathlevel based on root serverless file
        // to keep looking to the right path. (where the module will be merged)
        const resolve_paths = ['functions.*.handler', 'provider.ecr.images.*.path'];

        // move path forward/backword according diffpath between module and service
        for (const prop of resolve_paths) {
          const occurrences = list(modulejson, prop, { entries: true });
          for (const occurrence of occurrences) {
            // resolve the absolute diffpath back/fore for property path
            const path = resolve(diffpath, String(occurrence.value));
            // convert absolute to root relative path
            const relativepath = relative(servicepath, path);
            // override property with resolved path
            _.set(modulejson, occurrence.path.join('.'), relativepath);
          }
        }

        // merge module to service object
        servicejson = deepmerge(servicejson, modulejson);
      }
      // convert json to yml
      writeFileSync(`${resolve(servicepath, 'serverless.build.yml')}`, yaml.stringify(servicejson));
    }
  } catch (error: any) {
    console.error(error.message);
    exit(1);
  }
})();
