const { createClient } = require('./lib/client');

const validScenario = script => {
  if (!script.bind && !script.loop.bind) throw new Error('Bind operation must be provided');
  return true;
};

function LDAPEngine(script, ee, helpers) {
  this.script = script;
  this.ee = ee;
  this.helpers = helpers;
  this.target = script.target;

  return this;
}

LDAPEngine.prototype.createScenario = async (scenarioSpec, ee) => {
  const client = createClient(this.target);

  return (scenarioContext, done) => {
    done(error, context);
  };
};

module.exports = LDAPEngine;
