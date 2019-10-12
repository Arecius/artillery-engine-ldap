const debug = require('debug')('engine:ldap');
const { createClient } = require('./lib/client');

const allowedOperations = ['bind', 'search', 'unbind'];

const OPERATION_LOOP = 'loop';

const validScenario = script => {
  if (!script.bind) throw new Error('Bind operation must be provided');
  return true;
};

const operationName = step => Object.keys(step)[0];

const parseOperationResult = result => {
  if (result instanceof Array) return `${result.length} records returned`;
  return `${result ? 'success' : 'fail'}`;
};

const runStep = async (client, step) => {
  const operation = operationName(step);
  const options = step[operation];
  debug(`Executing ${operation} with options ${JSON.stringify(options)}`);
  if (operation === OPERATION_LOOP) {
    debug('Running loop');
  } else if (allowedOperations.includes(operation)) {
    const result = await client[operation](options);
    debug(`${operation}: ${parseOperationResult(result)}`);
  } else {
    throw new Error(`Unknown operation ${operation}`);
  }
};

function LDAPEngine(script, ee, helpers) {
  this.script = script;
  this.ee = ee;
  this.helpers = helpers;
  this.target = script.config.target;

  return this;
}

LDAPEngine.prototype.createScenario = function createScenario(scenarioSpec, ee) {
  const self = this;
  return async scenarioContext => {
    debug(`Running scenario ${scenarioSpec.name}`);
    ee.emit('started');

    debug(`LDAP Server: ${self.target}`);
    const client = await createClient(self.target);

    while (scenarioSpec.flow.length !== 0) {
      const step = scenarioSpec.flow.shift();
      await runStep(client, step);
    }

    ee.emit('done');
  };
};

module.exports = LDAPEngine;
