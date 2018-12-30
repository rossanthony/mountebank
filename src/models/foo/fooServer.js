'use strict';

/**
 * A sample protocol implementation, used for demo purposes only
 * @module
 */

function create (options, responseFn) {
    const Q = require('q'),
        net = require('net'),
        deferred = Q.defer(),
        server = net.createServer();

    server.on('connection', socket => {
        socket.on('data', data => {
            // Translate network request to JSON
            const helpers = require('../../util/helpers'),
                request = {
                    requestFrom: helpers.socketName(socket),
                    data: data.toString('utf8')
                };

            // call mountebank with JSON request
            responseFn(request).done(stubResponse => {
                // translate response JSON to network request
                const buffer = new Buffer(stubResponse.data, 'utf8');
                socket.write(buffer);
            });
        });
    });

    // Bind the socket to a port (the || 0 bit auto-selects a port if one isn't provided)
    server.listen(options.port || 0, () => {
        deferred.resolve({
            port: server.address().port,
            metadata: {},
            close: () => { server.close(); }
        });
    });

    return deferred.promise;
}

module.exports = {
    name: 'foo',
    testRequest: { data: '' },
    testProxyResponse: { data: '' },
    postProcess: function (response) { return { data: response.data || 'foo' }; },
    create: create,
    Proxy: require('../tcp/tcpProxy')
};
