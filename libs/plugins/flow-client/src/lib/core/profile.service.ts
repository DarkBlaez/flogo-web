import { map } from 'lodash';
import { Injectable } from '@angular/core';

import {
  RESTAPIContributionsService,
  FLOGO_CONTRIB_TYPE,
} from '@flogo-web/lib-client/core';
import { activitySchemaToTrigger } from './utils';

@Injectable()
export class FlogoProfileService {
  constructor(private contribService: RESTAPIContributionsService) {}

  getTriggers() {
    return this.contribService.listContribs(FLOGO_CONTRIB_TYPE.TRIGGER).then(response => {
      const data = response || [];
      return map(data, (trigger: any) => {
        return activitySchemaToTrigger(trigger);
      });
    });
  }
}
