const { connect } = require('nats');
const { program } = require('commander');

async function publish({server, subject, message, stream}) {
    try {
        const nc = await connect({ servers: server });
        console.log(`Connected to ${server}`);

        const js = nc.jetstream();

        // Codificar el mensaje como Uint8Array (requerido por NATS v2)
        const encoder = new TextEncoder();
        const data = encoder.encode(message);
        
        if (stream) {
            // Publicar a JetStream
            const pubAck = await js.publish(subject, data);
            console.log(`[${subject}] Message published to JetStream:`, {
                stream: pubAck.stream,
                sequence: pubAck.seq,
                message: message
            });
        } else {
            // Publicar a NATS core
            nc.publish(subject, data);
            console.log(`[${subject}] Message published to NATS:`, message);
        }

        await nc.drain();
        console.log('Connection closed');
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Execute if running directly
if (require.main === module) {
    program
        .name('nats-js-pub')
        .description('Publish messages to NATS server')
        .option('-s, --server <url>', 'NATS server URL', 'nats://localhost:4222')
        .requiredOption('-t, --topic <subject>', 'Subject to publish to')
        .option('-j, --jetstream', 'Publish to JetStream instead of NATS core')
        .argument('<message>', 'Message to publish')
        .addHelpText('after', `
Examples:
  $ nats-js-pub -s nats://localhost:4222 -t test.subject "Hello World"
  $ nats-js-pub -t test.subject "Simple message"
  $ nats-js-pub -t test.subject -j "Message to JetStream"`)
        .parse();

    const options = program.opts();
    
    publish({
        server: options.server,
        subject: options.topic,
        message: program.args[0],
        stream: options.jetstream
    });
}

module.exports = publish;