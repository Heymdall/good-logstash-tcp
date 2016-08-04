'use strict';

const Stream = require('stream');
const SafeStringify = require('json-stringify-safe');
const Logstash = require('./logstash');
const os = require('os');

const internals = {
    defaults: {
        threshold: 20,
    },
    host: os.hostname()
};

class GoodLogstashTcp extends Stream.Writable {
    constructor(config) {
        super({ objectMode: true });

        config = config || {}
        this._config = Object.assign({}, internals.defaults, config);

        if (!config.tlsOptions || !config.tlsOptions.host) {
            throw new Error('config.tlsOptions.host must be present')
        }

        if (this._config.disabled) {
            return
        }

        this._logstash = new Logstash({
            host: this._config.tlsOptions.host,
            port: this._config.tlsOptions.port
        });
    }

    _write(data, encoding, callback) {
        if (this._config.disabled) {
            setImmediate(callback);
            return;
        }

        let messages = (this._config.processor || this.defaultProcessor)(data);
        let self = this;
        messages.forEach(function (message) {
            self.log(message.level, message.msg, message.meta, message.timestamp);
        });

        setImmediate(callback);
    }

    defaultProcessor(payload, collector, internal, level) {
        collector = collector || [];
        internal = internal || false;
        level = level || '';

        let msg;
        let meta;
        let timestamp = payload.timestamp;
        let internalLogs = [];

        if (internal) {
            msg = `Request event: ${payload.request}`;
            meta = {
                requestId: payload.request,
                tags: payload.tags,
                data: payload.data
            }
        } else if (payload.event == 'log') {
            if (typeof payload.data === 'string') {
                msg = payload.data;
            } else if (typeof payload.data === 'object') {
                if (payload.data.message || payload.data.msg) {
                    msg = payload.data.message || payload.data.msg;
                    meta = Object.assign({ tags: payload.tags }, payload.data.meta);
                }
            }

            level = payload.tags[0] || 'DEBUG';
        } else if (payload.event == 'response') {
            msg = `${payload.method.toUpperCase()} ${payload.path} ${payload.statusCode} ${payload.responseTime}ms`;
            meta = {
                requestId: payload.id,
                method: payload.method,
                path: payload.path,
                query: payload.query,
                responseTime: payload.responseTime,
                statusCode: payload.statusCode,
                source: payload.source,
                detail: "\n" + SafeStringify(payload.log, null, 2)
            }
        }

        collector.push({ level, msg, meta, timestamp });
        internalLogs.forEach(function (payload) {
            this.defaultProcessor(payload, collector, true, level)
        });
        return collector;
    }

    log(level, msg, meta, timestamp) {
        if (this._config.disabled) {
            return;
        }

        let finalMeta = Object.assign({}, this._config.meta, meta);
        this._logstash.log(level, msg, finalMeta, timestamp, function () {});
    }
}

module.exports = GoodLogstashTcp;
