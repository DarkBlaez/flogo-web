'use strict';
let truncate = require('lodash/truncate');

module.exports = {
  formatFlow,
  formatFlowList,
  formatTileList
};

function formatFlow(flow, msg) {
  let pretext = msg ? msg : undefined;

  let text = flow.name;
  if(flow.description) {
    text = flow.description;
  } else if (flow.created) {
    text = `Created on ${flow.created}`;
  }

  return {
    attachments: [
      {
        pretext,
        fallback: flow.url,
        title: flow.name,
        title_link: flow.url,
        text,
        color: '#28D7E5'
      }
    ]
  };

}

function formatFlowList(flows, msg) {
  let pretext = msg ? msg : undefined;
  let flowList = (flows || []).map((flow, index) => `${index + 1}. <${flow.url}|${flow.name}>`).join('\n');

  return {
    attachments: [
      {
        pretext,
        fallback: 'Flows',
        title: 'Flows',
        text: flowList,
        mrkdwn_in: ['text', 'pretext']
      }
    ]
  };

}

/**
 *
 * @param tiles
 * @param options
 * @params options.title
 * @params options.msg
 * @returns {{attachments: *[]}}
 */
function formatTileList(tiles, options) {
  options = options || {};
  let pretext = options.msg ? options.msg : undefined;
  let text = (tiles || []).map(tile => `• *${tile.name}*: ${truncate(tile.description) || tile.name}`).join('\n');

  return {
    attachments: [
      {
        pretext,
        text,
        fallback: options.title || text,
        title: options.title || undefined,
        mrkdwn_in: ['text', 'pretext']
      }
    ]
  };
}
