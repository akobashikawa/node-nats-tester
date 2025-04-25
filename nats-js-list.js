const { connect } = require('nats');
const { program } = require('commander');

async function listStreams({ server, name, subjects, retention, storage, detail }) {
    try {
        const nc = await connect({ servers: server });
        console.log(`Connected to ${server}`);

        const jsm = await nc.jetstreamManager();

        // Get all streams info
        const streamsIterator = jsm.streams.list();
        const streams = [];
        for await (const stream of streamsIterator) {
            streams.push(stream);
        }
        // console.log(`\nTotal streams found: ${streams.length}`);

        // Filter streams based on parameters
        let filteredStreams = streams.filter(stream => {
            let matches = true;
            
            // Solo filtrar por nombre si se especificó uno
            if (name && stream.config.name !== name) {
                matches = false;
            }
            if (retention && stream.config.retention !== retention) {
                matches = false;
            }
            if (storage && stream.config.storage !== storage) {
                matches = false;
            }
            return matches;
        });
        // console.log(`\nFiltered streams count: ${filteredStreams.length}`);

        if (filteredStreams.length === 0) {
            console.log('No streams found matching the criteria');
        } else {
            console.log(`\nStreams found: ${filteredStreams.length}`);
            for (const stream of filteredStreams) {
                console.log(`\n[${filteredStreams.indexOf(stream) + 1}] ----------------------------------------`);
                console.log(`Name: ${stream.config.name}`);
                console.log(`Subjects: ${stream.config.subjects.join(', ')}`);
                console.log(`Retention: ${stream.config.retention}`);
                console.log(`Storage: ${stream.config.storage}`);
                console.log(`Messages: ${stream.state.messages}`);
                console.log(`Bytes: ${(stream.state.bytes / 1024 / 1024).toFixed(2)} MB`);

                if (detail && stream.state.messages > 0) {
                    try {
                        // Eliminar consumidor temporal si existe
                        try {
                            await jsm.consumers.delete(stream.config.name, 'temp_viewer');
                        } catch (err) {
                            // Ignorar error si el consumidor no existe
                        }

                        // Crear consumidor temporal de solo lectura
                        const js = nc.jetstream();

                        const consumer = await jsm.consumers.add(stream.config.name, {
                            durable_name: 'temp_viewer',
                            ack_policy: stream.config.retention === 'workqueue' ? "explicit" : "none",
                            deliver_policy: "all",
                            filter_subject: stream.config.subjects[0],
                            ack_wait: 30000000000,
                            max_deliver: 1
                        });

                        console.log('\n  Messages:');
                        // Leer mensajes usando JetStream pull consumer
                        const sub = await js.consumers.get(stream.config.name, 'temp_viewer');
                        
                        for (let i = 0; i < Math.ceil(stream.state.messages/10); i++) {
                            console.log(`\n  Fetching messages ${i*10+1} to ${(i+1)*10}...`);
                            const messages = await sub.fetch({ batch: 10, expires: 30000 });
                            for await (const msg of messages) {
                                console.log(`\n    [${msg.seq}] ----------------------`);
                                console.log(`    Subject: ${msg.subject}`);
                                console.log(`    Time: ${new Date(msg.info.timestampNanos/1000000).toLocaleString()}`);
                                try {
                                    const data = JSON.parse(msg.string());
                                    console.log(`    Data: ${JSON.stringify(data, null, 2)}`);
                                } catch {
                                    console.log(`    Data: ${msg.string()}`);
                                }
                            }
                        }
                    } finally {
                        // Limpieza inmediata del consumidor y suscripción
                        try {
                            await sub.unsubscribe();
                            await jsm.consumers.delete(stream.config.name, 'temp_viewer');
                        } catch (err) {
                            // Ignorar errores en la limpieza
                        }
                    }
                }
            }
        }

        // Cerrar la conexión inmediatamente
        await nc.close();
        console.log('\nConnection closed');
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Modificar las opciones del CLI
if (require.main === module) {
    program
        .name('nats-js-list')
        .description('List jetstreams in NATS server')
        .option('-s, --server <url>', 'NATS server URL', 'nats://localhost:4222')
        .option('-n, --name <name>', 'Name of stream')
        .option('-t, --topics <subjects>', 'Comma-separated subjects (e.g., "foo.*, bar.>")')
        .option('-r, --retention <type>', 'Filter by retention policy (workqueue, interest, limits)')
        .option('-g, --storage <type>', 'Filter by storage type (file, memory)')
        .option('-d, --detail', 'Show detailed message information')
        .addHelpText('after', `
Examples:
  $ nats-js-list                                   # List all streams
  $ nats-js-list -n stream1                        # Show specific stream
  $ nats-js-list -n stream1 -d                     # Show stream with message details
  $ nats-js-list -r workqueue                      # Filter by workqueue retention
  $ nats-js-list -g file                           # Filter by file storage`)
        .parse();

    const options = program.opts();
    listStreams({
        server: options.server,
        name: options.name,
        subjects: options.topics,
        retention: options.retention,
        storage: options.storage,
        detail: options.detail
    });
}

module.exports = listStreams;