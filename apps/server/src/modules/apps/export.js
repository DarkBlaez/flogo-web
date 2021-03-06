import isEqual from 'lodash/isEqual';
import cloneDeep from 'lodash/cloneDeep';

/**
 * Consolidates flows into the format expected by the flogo-cli
 * This means:
 * - Combine triggers based on its settings
 * - Point trigger endpoints to flows
 * @param {Array.<{flow:object, trigger:object}>} flowsData
 */
export function consolidateFlowsAndTriggers(flowsData = []) {
  const triggers = [];
  const flows = [];

  // same trigger if same ref and same settings
  const findExistingTriggerEntry = trigger =>
    triggers.find(
      entry => entry.ref === trigger.ref && isEqual(trigger.settings, entry.settings)
    );

  flowsData.forEach(flowData => {
    const { trigger, flow } = flowData;

    if (!flowData.trigger) {
      return; // empty trigger, we'll ignore it
    }

    const triggerEntry = determineTriggerEntry(trigger);
    const triggerEndpoints = trigger.handlers || [];
    const handlersEntry = triggerEndpoints[0] || { settings: {} };
    triggerEntry.handlers.push(handlersEntry);

    // link trigger to flow/action
    if (flowData.flow) {
      flows.push(flow);
      handlersEntry.actionId = flow.id;
    }
  });

  return {
    triggers,
    flows,
  };

  function determineTriggerEntry(trigger) {
    // find if we have already processed another instance of the same trigger
    let triggerEntry = findExistingTriggerEntry(trigger);
    // todo: make sure trigger id is unique
    if (!triggerEntry) {
      // no previous entry for this trigger, we need to create one
      triggerEntry = cloneDeep(trigger);
      triggerEntry.handlers = [];
      triggers.push(triggerEntry);
    }
    return triggerEntry;
  }
}
export default consolidateFlowsAndTriggers;
