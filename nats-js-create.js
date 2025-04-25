const { connect } = require('nats');
const { program } = require('commander');

async function createStream({ server, name, subjects, retention = 'workqueue', storage = 'file' }) {
    try {
        const nc = await connect({ servers: server });
        console.log(`Connected to ${server}`);

        const jsm = await nc.jetstreamManager();

        // Convert comma-separated string to array
        const subjectsArray = subjects.split(',').map(s => s.trim());

        const streamConfig = {
            name,
            subjects: subjectsArray,
            retention, // workqueue, interest, or limits
            storage,   // file or memory
            // max_msgs: 1000000,                    // máximo 1 millón de mensajes
            // max_msgs_per_subject: 100000,         // máximo 100k mensajes por subject
            // max_bytes: 1024 * 1024 * 1024,        // máximo 1GB total
            // max_age: 24 * 60 * 60 * 1000000000,   // retener por 24 horas (en nanosegundos)
            // max_msg_size: 1024 * 1024,            // máximo 1MB por mensaje
            // discard: "old",                       // descartar mensajes antiguos al llegar al límite
            // discard: "nuevos",                    // descartar mensajes nuevos al llegar al límite
            // duplicate_window: 120000000000,       // ventana de 2 minutos (en nanoseconds) para detectar duplicados
            max_msgs: 20,                            // máximo 20 mensajes
            max_msgs_per_subject: 10,                // máximo 10 mensajes por subject
            max_bytes: 1024 * 1024 * 1024,           // máximo 1GB total
            max_age: 10 * 60 * 1000000000,           // retener por 10 minutos (en nanosegundos)
            max_msg_size: 1024 * 1024,               // máximo 1MB por mensaje
            discard: "old",                          // descartar mensajes antiguos al llegar al límite
            duplicate_window: 2 * 60 * 1000000000,   // ventana de 2 minutos (en nanoseconds) para detectar duplicados
        };

        await jsm.streams.add(streamConfig);
        console.log(`Stream <${name}> created with configuration:`);
        console.log(JSON.stringify(streamConfig, null, 2));

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
        .name('nats-js-create')
        .description('Create jetstream in NATS server')
        .option('-s, --server <url>', 'NATS server URL', 'nats://localhost:4222')
        .requiredOption('-n, --name <name>', 'Name of stream')
        .requiredOption('-t, --topics <subjects>', 'Comma-separated subjects (e.g., "foo.*, bar.>")')
        .option('-r, --retention <type>', 'Retention policy (workqueue, interest, limits)', 'workqueue')
        .option('-g, --storage <type>', 'Storage type (file, memory)', 'file')
        .addHelpText('after', `
Examples:
  $ nats-js-create -s nats://localhost:4222 -n stream1 -t "orders.*,notifications.>"
  $ nats-js-create -n stream1 -t "test.>" -r limits -g memory`)
        .parse();

    const options = program.opts();

    createStream({
        server: options.server,
        name: options.name,
        subjects: options.topics,
        retention: options.retention,
        storage: options.storage
    });
}

module.exports = createStream;