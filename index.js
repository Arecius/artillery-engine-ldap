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
  for (const step of flow) await runStep(client, step, ee);
};

const runLoop = async (client, flow, count, ee) => {
  for (let counter = count; counter > 0; counter -= 1) await runFlow(client, flow, ee);
};

const runStep = async (client, step, ee) => {
  const operation = operationName(step);
  const options = step[operation];

  debug(`Executing ${operation} with options ${JSON.stringify(options)}`);

  if (operation === OPERATION_LOOP) {
    const { count, flow } = options;
    await runLoop(client, flow, count, ee);
  } else if (allowedOperations.includes(operation)) {
    ee.emit('request');
    const startedAt = time.getTime();
    let result = null;
    let status = 'succeeded';

    try {
      result = await client[operation](options);
    } catch (error) {
      status = 'failed';
      ee.emit('error', error);
    }

    const delta = time.getDelta(startedAt);
    ee.emit('response', delta, `${operation}: ${status}`);

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
  const { target: host, ldap: config } = this.script.config;
  this.helpers.template(spec.flow, { vars: { $processEnvironment: process.env } }, true);

  return async (context, callback) => {
    const { name, flow, skip } = spec;

    if (skip) {
      debug(`Skipping scenario ${name}`);
      return;
    }

    debug(`Running scenario ${name}`);

    ee.emit('started');

    debug(`LDAP Server host: ${host}`);
    debug(`LDAP Options: ${JSON.stringify(config)}`);

    const client = await createClient({ url: host, ...config });

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
