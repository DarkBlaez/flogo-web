import { Injectable } from '@angular/core';
import { AbstractTaskIdGenerator } from '../profiles.utils.service';
import { flogoIDEncode } from '../../../../shared/utils';

@Injectable()
export class FlogoDeviceTaskIdGeneratorService extends AbstractTaskIdGenerator {
  generateTaskID(items?: any) {
    let taskID: string;
    // TODO
    //  generate a more meaningful task ID in string format
    if (items) {
      taskID = this.calculateNextId(items);

    } else {
      // shift the timestamp for avoiding overflow 32 bit system
      /* tslint:disable-next-line:no-bitwise */
      taskID = '' + (Date.now() >>> 1);
    }

    return flogoIDEncode(taskID);
  }
}