const { connect } = require('nats');

async function checkNatsConnection(url = 'nats://localhost:4222') {
    console.log(`Checking NATS server at ${url}...`);
    try {
        const nc = await connect({ servers: url, timeout: 3000 });
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
    // Get URL from command line args or use default
    const url = process.argv[2] || 'nats://localhost:4222';
    checkNatsConnection(url)
        .then(isConnected => process.exit(isConnected ? 0 : 1))
        .catch(() => process.exit(1));
}

module.exports = checkNatsConnection;