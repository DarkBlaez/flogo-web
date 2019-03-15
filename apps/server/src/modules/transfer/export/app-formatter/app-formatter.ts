import { isEmpty, pick } from 'lodash';
import { ResourceExportContext, Resource, AppImportsAgent } from '@flogo-web/server/core';
import {
  App,
  FlogoAppModel,
  ContributionSchema,
  Handler,
  Trigger,
} from '@flogo-web/core';

import { ResourceExporterFn, HandlerExporterFn } from '../resource-exporter-fn';
import { makeHandlerFormatter } from './handler-format';
import { ExportedResourceInfo } from './exported-resource-info';
import { createRefAgent, RefAgent } from '../ref-agent';

const APP_MODEL_VERSION = '1.0.0';
const TRIGGER_KEYS: Array<keyof FlogoAppModel.Trigger> = [
  'id',
  'ref',
  'name',
  'description',
  'settings',
  'handlers',
];

export class AppFormatter {
  constructor(
    private contributionSchemas: Map<string, ContributionSchema>,
    private resourceTypeToRef: Map<string, string>,
    private exporter: {
      resource: ResourceExporterFn;
      handler: HandlerExporterFn;
    }
  ) {}

  format(app: App, resourceIdReconciler: Map<string, Resource>): FlogoAppModel.App {
    const importsAgent: RefAgent = createRefAgent(
      Array.from(this.contributionSchemas.values())
    );
    const exportContext: ResourceExportContext = {
      contributions: this.contributionSchemas,
      resourceIdReconciler,
      importsAgent,
    };

    const { resources, resourceInfoLookup } = this.formatResources(
      app.resources,
      exportContext
    );

    const formattedTriggers = this.formatTriggers(
      app.triggers,
      importsAgent,
      this.makeHandlerFormatter(resourceIdReconciler, resourceInfoLookup, importsAgent)
    );

    const allImports = importsAgent.formatImports();

    return {
      name: app.name,
      type: 'flogo:app',
      version: app.version,
      appModel: APP_MODEL_VERSION,
      description: app.description,
      properties: !isEmpty(app.properties) ? app.properties : undefined,
      imports: !isEmpty(allImports) ? allImports : undefined,
      triggers: !isEmpty(formattedTriggers) ? formattedTriggers : undefined,
      resources: !isEmpty(resources) ? resources : undefined,
    };
  }

  formatResources(resources: Resource[], exportContext: ResourceExportContext) {
    const resourceInfoLookup = new Map<string, ExportedResourceInfo>();
    const exportedResources: FlogoAppModel.Resource[] = [];
    resources.forEach(resource => {
      const exportedResource = this.exporter.resource(resource, exportContext);
      resourceInfoLookup.set(resource.id, {
        resource: exportedResource,
        type: resource.type,
        ref: this.resourceTypeToRef.get(resource.type),
      });
      exportedResources.push(this.exporter.resource(resource, exportContext));
    });
    return { resources: exportedResources, resourceInfoLookup };
  }

  formatTriggers(
    triggers: Trigger[],
    importsAgent: AppImportsAgent,
    handlerFormatter: (trigger: Trigger) => (handler: Handler) => FlogoAppModel.Handler
  ): FlogoAppModel.Trigger[] {
    return triggers
      .filter(trigger => !isEmpty(trigger.handlers))
      .map(trigger => {
        return pick(
          {
            ...trigger,
            handlers: trigger.handlers.map(handlerFormatter(trigger)),
            ref: importsAgent.registerRef(trigger.ref),
          },
          TRIGGER_KEYS
        ) as FlogoAppModel.Trigger;
      });
  }

  private makeHandlerFormatter(
    resourceIdReconciler: Map<string, Resource>,
    resourceInfoLookup: Map<string, ExportedResourceInfo>,
    importsAgent: AppImportsAgent
  ) {
    return makeHandlerFormatter({
      exportHandler: this.exporter.handler,
      contributionSchemas: this.contributionSchemas,
      importsAgent,
      getResourceInfo: oldResourceId =>
        resourceInfoLookup.get(resourceIdReconciler.get(oldResourceId).id),
    });
  }
}
