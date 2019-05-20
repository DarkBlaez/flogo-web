import * as path from 'path';

import { config } from '../../config/app-config';
import { createFolder as ensureDir } from '../../common/utils/file';

import { copyBinaryToDestination, removeDir } from './file-utils';
import { processHost } from '../../common/utils/process';
import { buildAndCopyBinary } from './build/binary';
import { buildPlugin } from './build/plugin';

import { loader } from './loader';
import { commander } from './commander';
import { execController as exec } from './exec-controller';
import { logger } from "../../common/logging";

const DIR_TEST_BIN = 'bin-test';
const DIR_BUILD_BIN = 'bin-build';

const TYPE_TEST = 'test';
const TYPE_BUILD = 'build';

type Options = Record<string, any>;

class Engine {
  static TYPE_TEST: string;
  static TYPE_BUILD: string;

  private readonly hostExt: string;
  private libVersion: string;
  private path: string;
  private runLogger: object;
  private installedContributions: object[];

  constructor(pathToEngine: string, libVersion: string, runLogger: object) {
    this.path = pathToEngine;
    this.hostExt = processHost.getExtensionForExecutables();
    this.installedContributions = [];
    this.libVersion = libVersion;
    this.runLogger = runLogger;
  }

  load() {
    return commander
      .list(this.path)
      .then(installedContribs => {
        return loader.loadMetadata(installedContribs);
      })
      .then((contribMetadata: object[]) => {
        this.installedContributions = contribMetadata;
        return contribMetadata;
      });
  }

  create(flogoDescriptorPath = null) {
    // todo: add support for lib version
    const options: Record<string, any> = {
      libVersion: this.libVersion,
    };
    if (flogoDescriptorPath) {
      options.flogoDescriptor = flogoDescriptorPath;
    }
    console.time('engine:create');
    return commander
      .create(this.path, options)
      .then(() =>
        Promise.all(
          [DIR_TEST_BIN, DIR_BUILD_BIN].map(dir =>
            ensureDir(path.resolve(this.path, dir))
          )
        )
      )
      .then((result: any) => {
        console.timeEnd('engine:create');
        return result;
      });
  }

  remove() {
    const deleteDir = () => removeDir(this.path);

    return this.stop()
      .then(deleteDir)
      .catch(() => Promise.resolve(deleteDir()));
  }

  exists() {
    return loader.exists(this.path);
  }

  getContributions() {
    return this.installedContributions;
  }

  hasContribution(nameOrPath: string) {
    return this._hasItem(this.getContributions(), nameOrPath);
  }

  /**
   *
   * @param options
   * @param {boolean} options.copyFlogoDescriptor
   * @return {Promise.<TResult>|*}
   * @deprecated
   */
  build(options: Options) {
    options = Object.assign({}, { type: TYPE_TEST }, options);

    let buildTargetDir;
    if (options.type === TYPE_BUILD) {
      buildTargetDir = DIR_BUILD_BIN;
      // using bin instead of DIR_BUILD_BIN since there seems to be no options to specify different trigger config location for build
      // options.configDir = DIR_BUILD_BIN;
    } else {
      buildTargetDir = DIR_TEST_BIN;
    }

    delete options.type;
    options.target = path.join(this.path, buildTargetDir);

    return ensureDir(options.target).then(() => buildAndCopyBinary(this.path, options));
  }

  buildPlugin(options: Options) {
    return ensureDir(path.join(this.path, DIR_BUILD_BIN)).then(() =>
      buildPlugin(this.path, options)
    );
  }

  buildOnly(options: Options) {
    return commander.build(this.path, options);
  }

  copyToBinTest() {
    const targetDir = path.join(this.path, DIR_TEST_BIN);
    return ensureDir(targetDir).then(() => copyBinaryToDestination(this.path, targetDir));
  }

  start() {
    return exec.start(this.path, this.getExecutableName(), {
      binDir: DIR_TEST_BIN,
      logPath: config.publicPath,
      logger: this.runLogger,
    });
  }

  stop() {
    return exec.stop(this.getExecutableName());
  }

  getExecutableName() {
    return `${path.parse(this.path).name}${this.hostExt}`;
  }

  /**
   * Add a flow to engine
   * @param {string|Path} flowPath - the path to flow json
   * @param {string} [flowName] - the name of this flow
   * @return {boolean} if successful, return true, otherwise return false
   */
  addFlow(flowPath: string) {
    return commander.add.flow(
      this.path,
      flowPath
    );
  }

  /**
   * Add/install a contrib bundle
   * @param bundlePath Path to contrib bundle
   * @param options
   * @param options.version {string} version
   */
  installContribBundle(bundlePath: string, options?: Options) {
    options = Object.assign(
      {
        /* version: this.libVersion */
      },
      options
    );
    return this._installItem('contribBundle', bundlePath, options);
  }

  /**
   * Add/install a contribution
   * @param contribPath Remote url or use local://path for local items
   * @param options
   * @param options.version {string} contrib versions
   */
  addContribution(contribPath: string, options: Options) {
    return this._installItem('contribution', contribPath, options);
  }

  /**
   * Install a contribution
   * @param {string} nameOrPath Contribution name or path (remote url or local://path)
   */
  installContribution(nameOrPath) {
    if (this.hasContribution(nameOrPath)) {
      logger.warn(`'${nameOrPath}' already exists. Updating it in the engine.`);
      return this.updateContribution(nameOrPath);
    } else {
      return this.addContribution(nameOrPath, { version: 'latest' });
    }
  }

  /**
   * Update a contribution
   * @param {string} nameOrPath Contribution name or path (remote url or local://path)
   */
  updateContribution(nameOrPath: string) {
    const label = `engine:update`;
    console.time(label);
    return commander.update(this.path, nameOrPath).then((result: any) => {
      console.timeEnd(label);
      return result;
    });
  }

  _installItem(
    itemType: 'contribution' | 'contribBundle',
    ref: string,
    options: Options
  ) {
    const label = `engine:install:${itemType}`;
    console.time(label);
    options = { ...options };
    return commander.add[itemType as string](this.path, ref, options).then(
      (result: any) => {
        console.timeEnd(label);
        return result;
      }
    );
  }

  _hasItem(where: { ref?: string }[], nameOrPath: string) {
    const foundItem = (where || []).find(item => item.ref === nameOrPath);
    return !!foundItem;
  }
}

// export type constants for outside use
Engine.TYPE_TEST = TYPE_TEST;
Engine.TYPE_BUILD = TYPE_BUILD;

export { Engine, TYPE_TEST, TYPE_BUILD };
export default Engine;
