# Artillery.io LDAP Plugin

<p align="center">
  <em>Load test your LDAP server with <a href="https://artillery.io">Artillery.io</a></em>
</p>

Based on  
[Kinesis Engine by Artillery](https://github.com/artilleryio/artillery-engine-kinesis)  
[AWS Lambda Engine by orchestrated](https://github.com/orchestrated-io/artillery-engine-lambda)


LDAP Operations supported:
- bind
- search
- unbind

**Important:** The plugin requires Artillery `1.5.8-3` or higher.

## Usage

### Install the plugin

```shell
npm i artillery-engine-ldap
```

## Configuration

1. set `config.target` to the LDAP Server hostname
2. Specify additional options in `config.ldap`:
    - `timeout` - Timeout(in ms) by Operation type

Specifics on Artillery script configuration can be found on the [Script Reference](https://artillery.io/docs/script-reference/)

### Bind configuration

- `dn` - DN of the Bind ser
- `password`  - password for the Binds user

### Search configuration

- `base` - DN of the node to used as starting point for the search
- `filter` - LDAP filter to be matched against the search results (default: objectClass=*)
- `scope` - Scope of the search (default: sub)
- `attributes` - List of attributes to be returned by the search
  
### Unbind configuration

- Unbind doesn't take any options

#### Example Script

```yaml
# Main Configuration section
config:
  target: "{{ $processEnvironment.TARGET }}" # LDAP Server Host to be tested
  # LDAP Engine Specific configuration
  ldap:
    unbind:
      timeout: 30000
    search:
      timeout: 30000
  # Load Test Phase configuration
  phases:
    - duration: 60 # Seconds
      arrivalRate: 5 # New connections/scenarios per second
  # Engine definition
  engines:
    ldap: {}
scenarios: # 2 Scenarios defined
  - name: "Users - single"
    engine: "ldap"
    flow:
      - bind:
          dn: "cn=admin,ou=users,dc=myDomain,dc=com"
          password: "{{ $processEnvironment.BIND_PASSWORD }}"
      - search:
          base: "ou=users,dc=myDomain,dc=com"
      - unbind: {}
  - name: "Users - average"
    engine: "ldap"
    flow:
      - bind:
          dn: "cn=admin,ou=users,dc=myDomain,dc=com"
          password: "{{ $processEnvironment.BIND_PASSWORD }}"
      - loop: # Loop operations sample
          flow:
            - search:
                base: "ou=users,dc=myDomain,dc=com"
          count: 2
      - unbind: true
```

### Run your script

`TARGET=ldaps://ldap.myDomain.com BIND_PASSWORD=password artillery run my_script.yml`

### Debugging
To enable debug messages on the output just prepend `DEBUG=*` to the artillery command.

```shell
DEBUG=* npx artillery run my_script.yml

DEBUG=engine:ldap npx artillery run my_script.yml
```



