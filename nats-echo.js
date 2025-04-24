const { connect } = require('nats');
const { program } = require('commander');

async function echo({server, subject}) {
    try {
        const nc = await connect({ servers: server });
        console.log(`Connected to ${server}`);
        console.log(`Listening for requests on subject: ${subject}`);

        // Subscribe to requests
        const subscription = nc.subscribe(subject, {
            callback: (err, msg) => {
                if (err) {
                    console.error('Error:', err);
                    return;
                }
                const requestData = msg.string();
                console.log(`[${subject}] Request received: ${requestData}`);
                
                // Reply with the same message
                msg.respond(requestData);
                console.log(`[${subject}] Echo sent: ${requestData}`);
            }
        });

        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            console.log('\nShutting down...');
            await subscription.unsubscribe();
            await nc.close();
            process.exit(0);
        });

        console.log('Echo service ready (Press Ctrl+C to exit)');
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Execute if running directly
if (require.main === module) {
    program
        .name('nats-echo')
        .description('Echo service for NATS request-reply pattern')
        .option('-s, --server <url>', 'NATS server URL', 'nats://localhost:4222')
        .requiredOption('-t, --topic <subject>', 'Subject to listen for requests')
        .addHelpText('after', `
Examples:
  $ nats-echo -s nats://localhost:4222 -t echo.service
  $ nats-echo -t echo.service`)
        .parse();

    const options = program.opts();
    
    echo({
        server: options.server,
        subject: options.topic
    });
}

module.exports = echo;