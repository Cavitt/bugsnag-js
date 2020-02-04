const { schema } = require('@bugsnag/core/config')
const { reduce } = require('@bugsnag/core/lib/es-utils')
const stringWithLength = require('@bugsnag/core/lib/validators/string-with-length')
const os = require('os')
const process = require('process')

module.exports = {
  projectRoot: {
    defaultValue: () => process.cwd(),
    validate: value => value === null || stringWithLength(value),
    message: 'should be string'
  },
  hostname: {
    defaultValue: () => os.hostname(),
    message: 'should be a string',
    validate: value => value === null || stringWithLength(value)
  },
  logger: {
    ...schema.logger,
    defaultValue: () => getPrefixedConsole()
  },
  releaseStage: {
    ...schema.releaseStage,
    defaultValue: () => process.env.NODE_ENV || 'production'
  },
  agent: {
    defaultValue: () => undefined,
    message: 'should be an HTTP(s) agent',
    validate: value => value === undefined || isAgent(value)
  },
  onUncaughtException: {
    defaultValue: () => (err, event, logger) => {
      logger.error(`Uncaught exception${getContext(event)}, the process will now terminate…\n${(err && err.stack) ? err.stack : err}`)
      process.exit(1)
    },
    message: 'should be a function',
    validate: value => typeof value === 'function'
  },
  onUnhandledRejection: {
    defaultValue: () => (err, event, logger) => {
      logger.error(`Unhandled rejection${getContext(event)}…\n${(err && err.stack) ? err.stack : err}`)
    },
    message: 'should be a function',
    validate: value => typeof value === 'function'
  }
}

const getPrefixedConsole = () => {
  return reduce(['debug', 'info', 'warn', 'error'], (accum, method) => {
    const consoleMethod = console[method] || console.log
    accum[method] = consoleMethod.bind(console, '[bugsnag]')
    return accum
  }, {})
}

const getContext = event =>
  event.request && Object.keys(event.request).length
    ? ` at ${event.request.httpMethod} ${event.request.path || event.request.url}`
    : ''

const isAgent = value => (typeof value === 'object' && value !== null) || typeof value === 'boolean'
