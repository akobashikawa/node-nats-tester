const { connect } = require('nats');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
async function publish({server, subject, message}) {
    try {
        const nc = await connect({ servers: server });
        console.log(`Conectado a ${server}`);

        nc.publish(subject, message);
        console.log(`Mensaje publicado en '${subject}': ${message}`);

        await nc.close();
        console.log('Conexión cerrada');
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
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
    .option('t', {
        alias: 'subject',
        describe: 'Subject to publish to',
        type: 'string',
        demandOption: true
    })
    .demandCommand(1, 'You need to provide a message to publish')
    .usage('Usage: $0 -s [server] -t [subject] <message>')
    .example('$0 -s nats://localhost:4222 -sub test.subject "Hello World"')
    .argv;

    publish({
        server: argv.server,
        subject: argv.subject,
        message: argv._.join(' ')});
}

module.exports = publish;