const { connect } = require('nats');
const { program } = require('commander');

async function publish({ server, subjects, message }) {
    try {
        const nc = await connect({ servers: server });
        console.log(`Connected to ${server}`);

        // Codificar el mensaje como Uint8Array (requerido por NATS v2)
        const encoder = new TextEncoder();
        const data = encoder.encode(message);

        // Dividir los subjects por comas y publicar en cada uno
        const subjectList = subjects.split(",").map(subject => subject.trim());
        if (subjectList.length === 0) {
            console.error('No subjects provided for publishing.');
            process.exit(1);
        }
        for (const subject of subjectList) {
            nc.publish(subject, data); // Elimina espacios en blanco
            console.log(`[${subject}] Message: ${message}`);
        }

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
        .name('nats-pubs')
        .description('Publish messages to many topics on NATS server')
        .option('-s, --server <url>', 'NATS server URL', 'nats://localhost:4222')
        .requiredOption('-t, --topics <subjects>', 'Subjects to publish to')
        .argument('<message>', 'Message to publish')
        .addHelpText('after', `
Examples:
  $ nats-pubs -s nats://localhost:4222 -t "test.topic1,test.topic2" "Hello World"
  $ nats-pubs -t "test.topic1,test.topic2" "Simple message"`)
        .parse();

    const options = program.opts();

    publish({
        server: options.server,
        subjects: options.topics,
        message: program.args[0]
    });
}

module.exports = publish;