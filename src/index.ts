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
import { resolve, dirname, relative, join, basename } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { customTags } from './tags';
import { CliArgsType } from './types';
import { removeQuotes, removeTagQuotes } from "./utils"

// get all provided arguments
const args = yargs(hideBin(process.argv)).argv as unknown as CliArgsType;
const errors: Array<string> = [];

// exit error if exists some validation error
if (errors.length > 0) {
  console.error(errors);
  exit(1);
}

// execute cli function
(async () => {
  try {

    // get devmode
    const devmode = args.dev || false;
    console.log('devmode =', String(devmode));

    const __dirname = shell.pwd().stdout;
    console.log('entrypoint execution directory', __dirname);


    // 1) try to access specific sls filename provided by args or serverless.yml by default
    let filename = args.file ?? 'serverless.yml';
    if (!existsSync(resolve(__dirname, filename))) filename = 'serverless-compose.yml';
    if (!existsSync(resolve(__dirname, filename))) throw new Error('serverless file not provided');

    // 2) get basepath from filename with resolve dirname
    const rootpath = dirname(resolve(__dirname, filename));
    console.log('service root directory', rootpath);

    // remove any path from filename if provided by arg --file
    // because from now on, it will be joined with rootpath
    filename = basename(filename);

    // 3) convert serverless (single sls) to array, or capture sls files on serverless-compose paths as array
    const data = readFileSync(resolve(rootpath, filename), { encoding: 'binary' });
    const json = yaml.parse(data, { customTags });
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
      let servicejson = yaml.parse(servicedata, { customTags });

      // clean build file before starting build (only in devmode)
      if (devmode) await shell.exec(`rm ${resolve(servicepath, 'serverless.build.yml')}`);

      // iterate all modules of current service
      // * ignore other service folder (even child/subchild)
      const modules = await glob(servicepath + '/**/*.m.yml', {
        ignore: paths
          .filter((path) => path.startsWith(servicepath) && path !== servicepath)
          .map((path) => `${path}/**`),
      });
      for (const module of modules) {
        const moduledata = readFileSync(module, { encoding: 'binary' });
        const modulejson = yaml.parse(moduledata, { customTags });

        // get the diff path between servicepath and modulepath
        const diffpath = join(servicepath, relative(servicepath, dirname(module)));

        // check each module file for configs with related paths
        // and adjust its pathlevel based on root serverless file
        // to keep looking to the right path. (where the module will be merged)
        const resolve_paths = ['functions.*.handler', 'provider.ecr.images.*.path', 'functions.*.package.include.*'];

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
      // convert json to yml [add .build suffix if devmode is enabled]
      const builtYaml = yaml.stringify(servicejson, {blockQuote:false, keepSourceTokens: true, version:"1.1"})
      writeFileSync(`${resolve(servicepath, `serverless${devmode ? '.build' : ''}.yml`)}`, removeTagQuotes(builtYaml));
    }
  } catch (error: any) {
    console.error(error.message);
    exit(1);
  }
})();
