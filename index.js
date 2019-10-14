const debug = require('debug')('engine:ldap');
const { createClient } = require('./lib/client');
const time = require('./lib/time');

const allowedOperations = ['bind', 'search', 'unbind'];

const OPERATION_LOOP = 'loop';

const operationName = step => Object.keys(step)[0];

const parseOperationResult = result => {
  if (result instanceof Array) return `${result.length} records returned`;
  return `${result ? 'success' : 'fail'}`;
};

const runFlow = async (client, flow, ee) => {
  while (flow.length !== 0) await runStep(client, flow.shift(), ee);
};

const runLoop = async (client, flow, count, ee) => {
  for (let counter = count; counter > 0; counter -= 1) await runFlow(client, flow, ee);
};

const runStep = async (client, step, ee) => {
  const operation = operationName(step);
  const options = step[operation];

  debug(`Executing ${operation} with options ${JSON.stringify(options)}`);

  if (operation === OPERATION_LOOP) {
    const { loop: steps, count } = options;
    await runLoop(steps, count);
  } else if (allowedOperations.includes(operation)) {
    ee.emit('request');
    const startedAt = time.getTime();
    const result = await client[operation](options);
    const delta = time.getDelta(startedAt);
    ee.emit('response', delta, 'Success');
    debug(`${operation}: ${parseOperationResult(result)}`);
  } else {
    ee.emit('error', new Error(`Unknown operation ${operation}`));
  }
};

function LDAPEngine(script, ee, helpers) {
  this.script = script;
  this.ee = ee;
  this.helpers = helpers;

  return this;
}

LDAPEngine.prototype.createScenario = function createScenario(spec, ee) {
  const ldapHost = this.script.config.target;
  const config = this.script.config.ldap || {};

  return async (context, callback) => {
    const { name, flow } = spec;

    debug(`Running scenario ${name}`);

    ee.emit('started');

    debug(`LDAP Server host: ${ldapHost}`);
    debug(`LDAP Options: ${JSON.stringify(config)}`);

    const client = await createClient({ url: ldapHost, ...config });

    try {
      await runFlow(client, flow, ee);
    } catch (error) {
      ee.emit('error', error);
    }
    debug(`Finishing scenario ${name}`);
    ee.emit('done');
    callback(null, context);
  };
};

module.exports = LDAPEngine;
