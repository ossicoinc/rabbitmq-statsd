var AMQPStats = require('amqp-stats'),
    logger = require('winston'),
    config = require('./config.json'),
    SDC = require('statsd-client'),
    statsdClient = new SDC({
        host: 'statsd',
        port: '8125',
        prefix: 'rabbit'
    });

// config winston
// logger.add(logger.transports.File, {
//     filename: config.logPath
// });
logger.configure({transports: [new (logger.transports.Console)({
        level: 'info',
        humanReadableUnhandledException: true
    })]
});

function checkVar(v) {
    if (!process.env[v]) {
        throw new Error("env var " + v + " is not set");
    }
}
checkVar('RABBIT_ADMIN_USERNAME');
checkVar('RABBIT_ADMIN_PASSWORD');
checkVar('VIDEO_RABBIT_SERVER');
// checkVar('VIDEO_RABBIT_PORT');

    // stasd client creation
var stats = new AMQPStats({
        username: process.env.RABBIT_ADMIN_USERNAME || 'nousername',
        password: process.env.RABBIT_ADMIN_PASSWORD || 'nopass',
        hostname: process.env.VIDEO_RABBIT_SERVER + ':15672',
        protocol: config.amqp.protocol
    });

logger.info('Rabbit monitoring starting');
logger.debug(config);

var collectQueuesStats = function() {

    // fetch stats on all server queues
    stats.queues(function(err, res, data) {
        if (err) {
            logger.error(err);
            return false;
        }

        for (var i = 0; i < data.length; i++) {
            var queue = data[i];
            // this name will be prefix by statsd.prefix configuration
            var queueNamespace = 'queues.' + queue.name + '.';
            statsdClient.gauge(queueNamespace + 'memory', queue.memory);

            // this key is here only if at least one message was send to the queue
            if (queue.message_stats) {
                statsdClient.gauge(queueNamespace + 'ack', queue.message_stats.ack);
                statsdClient.gauge(queueNamespace + 'deliver', queue.message_stats.deliver);
                statsdClient.gauge(queueNamespace + 'publish', queue.message_stats.publish);
                statsdClient.gauge(queueNamespace + 'redeliver', queue.message_stats.redeliver);
                statsdClient.gauge(queueNamespace + 'consumers', queue.message_stats.consumers);
            }

            statsdClient.gauge(queueNamespace + 'messages', queue.messages);
            statsdClient.gauge(queueNamespace + 'messagesReady', queue.messages_ready);
            statsdClient.gauge(queueNamespace + 'messagesUnacknowledged', queue.messages_unacknowledged);
        }
    });
};


// collect data now
collectQueuesStats();

// start interval
setInterval(collectQueuesStats, config.collectInterval);