const { connect } = require('nats');
const { program } = require('commander');

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
    program
        .name('nats-check')
        .description('Check NATS server connectivity')
        .option('-s, --server <url>', 'NATS server URL', 'nats://localhost:4222')
        .addHelpText('after', `
Examples:
  $ nats-check                          # Check default NATS server
  $ nats-check -s nats://localhost:4222 # Check specific NATS server
        `)
        .parse();

    const options = program.opts();
    
    checkNatsConnection(options.server)
        .then(isConnected => process.exit(isConnected ? 0 : 1))
        .catch(() => process.exit(1));
}

module.exports = checkNatsConnection;