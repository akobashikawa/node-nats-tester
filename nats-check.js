const { connect } = require('nats');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

async function checkNatsConnection(server = 'nats://localhost:4222') {
    console.log(`Checking NATS server at ${server}...`);
    try {
        const nc = await connect({ servers: server, timeout: 3000 });
        console.log('✅ NATS server is running and accessible');
        await nc.close();
        return true;
    } catch (error) {
        console.error('❌ NATS server is not accessible');
        console.error(`Error details: ${error.message}`);
        return false;
    }
}

// Execute if running directly
if (require.main === module) {
    const argv = yargs(hideBin(process.argv))
        .option('s', {
            alias: 'server',
            describe: 'NATS server URL',
            type: 'string',
            default: 'nats://localhost:4222'
        })
        .usage('Usage: $0 [-s <server-url>]')
        .example('$0', 'Check default NATS server')
        .example('$0 -s nats://localhost:4222', 'Check specific NATS server')
        .help('h')
        .alias('h', 'help')
        .argv;

    checkNatsConnection(argv.server)
        .then(isConnected => process.exit(isConnected ? 0 : 1))
        .catch(() => process.exit(1));
}

module.exports = checkNatsConnection;