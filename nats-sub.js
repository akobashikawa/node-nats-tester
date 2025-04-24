const { connect } = require('nats');
const { program } = require('commander');

async function subscribe({server, subject}) {
    try {
        const nc = await connect({ servers: server });
        console.log(`Connected to ${server}`);
        console.log(`Listening for messages on subject: ${subject}`);

        // Subscribe to the subject
        const subscription = nc.subscribe(subject);
        
        // Process incoming messages
        for await (const msg of subscription) {
            const data = msg.string(); // Decode message data as string
            console.log(`[${subject}] Received: ${data}`);
        }

        // Note: This code will only execute if subscription is closed
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
        .name('nats-sub')
        .description('Subscribe to subject on NATS server')
        .option('-s, --server <url>', 'NATS server URL', 'nats://localhost:4222')
        .requiredOption('-t, --topic <subject>', 'Subject to subscribe to')
        .addHelpText('after', `
Examples:
  $ nats-sub -s nats://localhost:4222 -t test.subject
  $ nats-sub -t test.subject`)
        .parse();

    const options = program.opts();
    
    subscribe({
        server: options.server,
        subject: options.topic
    });
}

module.exports = subscribe;