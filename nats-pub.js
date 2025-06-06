const { connect } = require('nats');
const { program } = require('commander');

async function publish({server, subject, message}) {
    try {
        const nc = await connect({ servers: server });
        console.log(`Connected to ${server}`);

        // Codificar el mensaje como Uint8Array (requerido por NATS v2)
        const encoder = new TextEncoder();
        const data = encoder.encode(message);
        
        nc.publish(subject, data);
        console.log(`[${subject}] Message: ${message}`);

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
        .name('nats-pub')
        .description('Publish messages to NATS server')
        .option('-s, --server <url>', 'NATS server URL', 'nats://localhost:4222')
        .requiredOption('-t, --topic <subject>', 'Subject to publish to')
        .argument('<message>', 'Message to publish')
        .addHelpText('after', `
Examples:
  $ nats-pub -s nats://localhost:4222 -t test.subject "Hello World"
  $ nats-pub -t test.subject "Simple message"`)
        .parse();

    const options = program.opts();
    
    publish({
        server: options.server,
        subject: options.topic,
        message: program.args[0]
    });
}

module.exports = publish;