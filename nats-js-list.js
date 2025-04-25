const { connect } = require('nats');
const { program } = require('commander');

async function listStreams({ server, name, subjects, retention, storage }) {
    // console.log({ server, name, subjects, retention, storage });
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
            filteredStreams.forEach((stream, index) => {
                console.log(`\n[${index + 1}] ----------------------------------------`);
                console.log(`Name: ${stream.config.name}`);
                console.log(`Subjects: ${stream.config.subjects.join(', ')}`);
                console.log(`Retention: ${stream.config.retention}`);
                console.log(`Storage: ${stream.config.storage}`);
                
                // Show additional details
                console.log(`Messages: ${stream.state.messages}`);
                console.log(`Bytes: ${(stream.state.bytes / 1024 / 1024).toFixed(2)} MB`);
            });
        }

        await nc.drain();
        console.log('\nConnection closed');
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Execute if running directly
if (require.main === module) {
    program
        .name('nats-js-list')
        .description('List jetstreams in NATS server')
        .option('-s, --server <url>', 'NATS server URL', 'nats://localhost:4222')
        .option('-n, --name <name>', 'Name of stream')
        .option('-t, --topics <subjects>', 'Comma-separated subjects (e.g., "foo.*, bar.>")')
        .option('-r, --retention <type>', 'Filter by retention policy (workqueue, interest, limits)')
        .option('-g, --storage <type>', 'Filter by storage type (file, memory)')
        .addHelpText('after', `
Examples:
  $ nats-js-list                                   # List all streams
  $ nats-js-list -n stream1                        # Show specific stream
  $ nats-js-list -r workqueue                      # Filter by workqueue retention
  $ nats-js-list -g file                           # Filter by file storage`)
        .parse();

    const options = program.opts();

    listStreams({
        server: options.server,
        name: options.name,
        subjects: options.topics,
        retention: options.retention,
        storage: options.storage
    });
}

module.exports = listStreams;