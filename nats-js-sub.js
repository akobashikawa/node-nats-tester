const { connect } = require('nats');
const { program } = require('commander');

async function subscribe({server, subject}) {
    try {
        const nc = await connect({ servers: server });
        console.log(`Connected to ${server}`);

        // Obtener información de streams
        const jsm = await nc.jetstreamManager();
        const streams = [];
        for await (const stream of jsm.streams.list()) {
            streams.push(stream);
        }

        console.log(`Listening for messages on subject: ${subject}`);

        // Subscribe to the subject
        const subscription = nc.subscribe(subject);
        
        // Process incoming messages
        for await (const msg of subscription) {
            // Encontrar streams que manejan este subject
            const matchingStreams = streams.filter(stream => 
                stream.config.subjects.some(pattern => 
                    new RegExp('^' + pattern.replace(/\*/g, '[^.]+').replace(/>/g, '.*') + '$').test(msg.subject)
                )
            );

            const data = msg.string();
            try {
                const jsonData = JSON.parse(data);
                console.log(`[${msg.subject}${matchingStreams.length ? ' → ' + matchingStreams.map(s => s.config.name).join(', ') : ''}] Received:`, 
                    JSON.stringify(jsonData, null, 2));
            } catch {
                console.log(`[${msg.subject}${matchingStreams.length ? ' → ' + matchingStreams.map(s => s.config.name).join(', ') : ''}] Received: ${data}`);
            }
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
        .name('nats-js-sub')
        .description('Subscribe to subject on NATS server')
        .option('-s, --server <url>', 'NATS server URL', 'nats://localhost:4222')
        .requiredOption('-t, --topic <subject>', 'Subject to subscribe to')
        .addHelpText('after', `
Examples:
  $ nats-js-sub -s nats://localhost:4222 -t test.subject
  $ nats-js-sub -t test.subject`)
        .parse();

    const options = program.opts();
    
    subscribe({
        server: options.server,
        subject: options.topic
    });
}

module.exports = subscribe;