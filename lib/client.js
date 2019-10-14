const { createClient, LDAP_SUCCESS } = require('ldapjs');

const defaultOptions = {
  tlsOptions: {
    rejectUnauthorized: false,
  },
};

const SCOPE = {
  BASE: 'base',
  ONE: 'one',
  SUB: 'sub',
};

const parseEntry = entry => {
  const { dn, attributes } = entry;

  const parsedAttributes = attributes.reduce((accumulator, { type, vals: values }) => {
    accumulator[type] = values.length > 1 ? values : values[0];
    return accumulator;
  }, {});

  return {
    dn,
    attributes: parsedAttributes,
  };
};

const bind = (ldapClient, { dn, password }) =>
  new Promise((resolve, reject) => {
    ldapClient.bind(dn, password, error => (error ? reject(error) : resolve(true)));
  });

const unbind = ldapClient =>
  new Promise((resolve, reject) => {
    // LDAPJS Unbind workaround
    setTimeout(resolve(true), ldapClient.config.unbind.timeout);
    ldapClient.unbind(error => (error ? reject(error) : resolve(true)));
  });

const destroy = ldapClient =>
  new Promise((resolve, reject) => {
    ldapClient.destroy(error => {
      return error ? reject(error) : resolve(true);
    });
  });

const search = (ldapClient, { base, scope = SCOPE.SUB, filter, attributes }) =>
  new Promise((resolve, reject) => {
    if (!Object.values(SCOPE).includes(scope.toLowerCase()))
      reject(new Error(`Unknown scope: ${scope}`));

    ldapClient.search(base, { scope, filter, attributes }, (error, response) => {
      if (error) return reject(error);

      const results = [];
      response.on('searchEntry', entry => results.push(parseEntry(entry)));

      response.on('error', reject);

      response.on('end', result => {
        return result.status === LDAP_SUCCESS ? resolve(results) : reject(result);
      });
    });
  });

const client = async host => {
  let clientConfig = null;

  if (typeof host === 'string') {
    clientConfig = { ...defaultOptions, url: host };
  } else if (host instanceof Object && Object.keys(host).includes('url')) {
    clientConfig = { ...defaultOptions, ...host };
  } else {
    throw new Error('Argument must be a string or an Object containing a host');
  }
  const ldapClient = await createClient(clientConfig);

  ldapClient.clientConfig = clientConfig;

  return {
    bind: options => bind(ldapClient, options),
    unbind: () => unbind(ldapClient),
    destroy: () => destroy(ldapClient),
    search: options => search(ldapClient, options),
  };
};

module.exports = {
  createClient: client,
  SCOPE,
};
