# good-logstash-tcp
A good reporter to communicate directly with a logstash instance

## Install

```javascript
npm install --save good-logstash-tcp
```

## Usage

`good-logstash-tcp` is a write stream use to send events to logstash

Example for sending all log events to logstash

```javascript
connection.register({
    register: require('good'),
    options: {
        reporters: {
            logstash: [
                {
                    module: 'good-squeeze',
                    name: 'Squeeze',
                    args: [{ log: '*'}]
                },
                {
                    module: 'good-logstash-tcp',
                    args: [{
                        tlsOptions: {
                            host: 'localhost',
                            port: 8001
                        }
                    }]
                }
            ]
        } 
    }
);
```
