const data = require('./data.js');
const tweet = require('./tweet.js');

function usage() {
    console.log('Usage: node . [data|tweet]');
}

if (process.argv.length != 3) {
    // Show usage on incorrect argument count.
    usage();
} else {
    switch (process.argv[2]) {
        case 'data':
            // With data arg, call the data module.
            data();
            break;
        case 'tweet':
            // If tweet arg, call the tweet module.
            tweet();
            break;
        default:
            // Otherwise show usage.
            usage();
            break;
    }
}