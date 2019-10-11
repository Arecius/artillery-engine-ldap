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

const bind = (ldapClient, dn, password) =>
  new Promise((resolve, reject) => {
    ldapClient.bind(dn, password, error => (error ? reject(error) : resolve(true)));
  });

const unbind = ldapClient =>
  new Promise((resolve, reject) => {
    ldapClient.unbind(error => {
      return error ? reject(error) : resolve(true);
    });
  });

const destroy = ldapClient =>
  new Promise((resolve, reject) => {
    ldapClient.destroy(error => {
      return error ? reject(error) : resolve(true);
    });
  });

const search = (ldapClient, base, scope = SCOPE.SUB, filter, attributes) =>
  new Promise((resolve, reject) => {
    if (!SCOPE.includes(scope)) reject(new Error(`Unknown scope: ${scope}`));

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
  const options = null;

  if (typeof host == 'string') {
    options = { ...defaultOptions, url: host };
  } else if (host instanceof Object && Object.keys.includes('host')) {
    options = { ...defaultOptions, ...host };
  } else {
    throw new Error('Argument must be a string or an Object containing a host');
  }

  const ldapClient = await createClient(options);
  return {
    bind: (bindDN, password) => bind(ldapClient, bindDN, password),
    unbind: () => unbind(ldapClient),
    destroy: () => destroy(ldapClient),
    search: (base, scope, filter, attributes) =>
      search(ldapClient, base, scope, filter, attributes),
  };
};

module.exports = {
  createClient: client,
  SCOPE,
};