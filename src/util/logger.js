'use strict';

function initializeLogfile (filename) {
    // Ensure new logfile on startup so the /logs only shows for this process
    const path = require('path'),
        fs = require('fs-extra'),
        extension = path.extname(filename),
        pattern = new RegExp(`${extension}$`),
        newFilename = filename.replace(pattern, `1${extension}`);

    if (fs.existsSync(filename)) {
        fs.renameSync(filename, newFilename);
    }
}

function logFormat (config) {
    const template = config.replace(/\$/g, '\\$') // prevent injection attacks
        .replace(/%level/g, '${info.level}')
        .replace(/%message/g, '${info.message}')
        .replace(/%timestamp/g, '${info.timestamp}')
        .replace(/%host/g, '${info.host}')
        .replace(/%pid/g, '${info.pid}');

    // eslint-disable-next-line no-new-func
    return new Function('info', `return \`${template}\`;`);
}

function createWinstonFormat (format, config) {
    const hostAndPid = format(info => {
            info.host = require('os').hostname();
            info.pid = process.pid;
            return info;
        }),
        formatters = [format.timestamp(), hostAndPid()];
    if (config.colorize) {
        formatters.push(format.colorize());
    }
    if (config.format === 'json') {
        formatters.push(format.json());
    }
    else {
        formatters.push(format.printf(logFormat(config.format)));
    }
    return format.combine(...formatters);
}

function createLogger (options) {
    if (!options.log) {
        options.log = { level: 'info' };
    }
    if (!options.log.transports) {
        options.log.transports = {};
    }
    const winston = require('winston'),
        winstonLogger = winston.createLogger({ level: options.log.level }),
        ScopedLogger = require('./scopedLogger'),
        logger = ScopedLogger.create(winstonLogger, `[mb:${options.port}] `),
        consoleConfig = options.log.transports.console,
        fileConfig = options.log.transports.file;

    if (consoleConfig) {
        winstonLogger.add(new winston.transports.Console({
            format: createWinstonFormat(winston.format, consoleConfig)
        }));
    }
    if (fileConfig) {
        initializeLogfile(fileConfig.path);
        winstonLogger.add(new winston.transports.File({
            filename: fileConfig.path,
            maxsize: '20m',
            maxFiles: 5,
            tailable: true,
            format: createWinstonFormat(winston.format, fileConfig)
        }));
    }

    return logger;
}

module.exports = { createLogger };

