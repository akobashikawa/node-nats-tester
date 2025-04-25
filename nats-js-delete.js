const { connect } = require('nats');
const { program } = require('commander');
const inquirer = require('inquirer');

async function deleteStream({ server, name, subjects, retention, storage, quiet }) {
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

        if (filteredStreams.length === 0) {
            console.log('No streams found matching the criteria');
        } else {
            console.log(`\nStreams found: ${filteredStreams.length}`);
            
            // Show streams that will be deleted
            filteredStreams.forEach((stream, index) => {
                console.log(`\n[${index + 1}] ----------------------------------------`);
                console.log(`Name: ${stream.config.name}`);
                console.log(`Subjects: ${stream.config.subjects.join(', ')}`);
                console.log(`Retention: ${stream.config.retention}`);
                console.log(`Storage: ${stream.config.storage}`);
                console.log(`Messages: ${stream.state.messages}`);
                console.log(`Bytes: ${(stream.state.bytes / 1024 / 1024).toFixed(2)} MB`);
            });

            if (quiet) {
                // Delete all streams without confirmation
                for (const stream of filteredStreams) {
                    try {
                        await jsm.streams.delete(stream.config.name);
                        console.log(`✓ Deleted stream: ${stream.config.name}`);
                    } catch (err) {
                        console.error(`✗ Error deleting stream ${stream.config.name}:`, err.message);
                    }
                }
            } else {
                // Ask for each stream
                for (const stream of filteredStreams) {
                    const { confirm } = await inquirer.prompt([{
                        type: 'confirm',
                        name: 'confirm',
                        message: `Delete stream "${stream.config.name}"?`,
                        default: false
                    }]);

                    if (confirm) {
                        try {
                            await jsm.streams.delete(stream.config.name);
                            console.log(`✓ Deleted stream: ${stream.config.name}`);
                        } catch (err) {
                            console.error(`✗ Error deleting stream ${stream.config.name}:`, err.message);
                        }
                    } else {
                        console.log(`⚪ Skipped stream: ${stream.config.name}`);
                    }
                }
            }
            
            console.log('\nOperation completed');
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
        .name('nats-js-delete')
        .description('Delete jetstreams in NATS server')
        .option('-s, --server <url>', 'NATS server URL', 'nats://localhost:4222')
        .option('-n, --name <name>', 'Name of stream')
        .option('-t, --topics <subjects>', 'Comma-separated subjects (e.g., "foo.*, bar.>")')
        .option('-r, --retention <type>', 'Filter by retention policy (workqueue, interest, limits)')
        .option('-g, --storage <type>', 'Filter by storage type (file, memory)')
        .option('-q, --quiet', 'Delete without confirmation')
        .addHelpText('after', `
Examples:
  $ nats-js-delete                                   # Delete all streams (with confirmation)
  $ nats-js-delete -n stream1 -q                     # Delete specific stream without confirmation
  $ nats-js-delete -r workqueue -q                   # Delete all workqueue streams without confirmation
  $ nats-js-delete -g file                           # Delete file-based streams (with confirmation)`)
        .parse();

    const options = program.opts();

    deleteStream({
        server: options.server,
        name: options.name,
        subjects: options.topics,
        retention: options.retention,
        storage: options.storage,
        quiet: options.quiet
    });
}

module.exports = deleteStream;