const { connect } = require('nats');
const { program } = require('commander');

async function request({server, subject, message}) {
    try {
        const nc = await connect({ servers: server });
        console.log(`Connected to ${server}`);

        // Codificar el mensaje como Uint8Array (requerido por NATS v2)
        const encoder = new TextEncoder();
        const data = encoder.encode(message);
        const response = await nc.request(subject, data);
        console.log(`[${subject}] Request: ${message}`);
        console.log(`[${subject}] Response:`, response.string());

        // await nc.close();
        await nc.drain();  // Mejor práctica: drenar antes de cerrar
        console.log('Connection closed');
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Execute if running directly
if (require.main === module) {
    program
        .name('nats-request')
        .description('Request to replier on NATS server')
        .option('-s, --server <url>', 'NATS server URL', 'nats://localhost:4222')
        .requiredOption('-t, --topic <subject>', 'Subject to request to')
        .argument('<message>', 'Message to send to replier')
        .addHelpText('after', `
Examples:
  $ nats-request -s nats://localhost:4222 -t test.subject "Hello World"
  $ nats-request -t test.subject "Simple request"`)
        .parse();

    const options = program.opts();
    
    request({
        server: options.server,
        subject: options.topic,
        message: program.args[0]
    });
}

module.exports = request;