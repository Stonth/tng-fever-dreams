const path = require('path');
const fs = require('fs');
const Twitter = require('twitter');
const child_process = require('child_process');

// Path to the root directory of the char rnn.
// See: https://github.com/karpathy/char-rnn
const CHAR_RNN_PATH = path.join(__dirname, '..', 'lib', 'char-rnn');

// Regex representing an acceptable line if dialog.
const DIALOG_REGEX = /[A-Z/ ()Oo.Ss.Cc]+: .+\n/g;

/*
    Get a sampling from the RNN given a seed and a sample length.
*/
function getSampling(seed, l) {
    return new Promise((resolve, reject) => {
        let str = '';

        // Start the sample script.
        const p = child_process.spawn('th', [
            path.join(CHAR_RNN_PATH, 'sample.lua'), // Path to sample script
            path.join(__dirname, '..', 'data', 'checkpoint.t7'), // Path to checkpoint
            '-seed', // The seed
            seed.toString(),
            '-length', // The length
            l
        ], {
            cwd: CHAR_RNN_PATH
        });

        // On data, append to string.
        p.stdout.on('data', (data) => {
            str += data;
        });

        // On error, reject.
        p.stderr.on('data', (data) => {
            reject(new Error('Sample error. ' + data));
        });

        // On close, reject or resolve the final string.
        p.on('close', (code) => {
            if (code > 0) {
                reject(new Error('Sample ended with code ' + code));
            }
            else {
                resolve(str);
            }
        });
    });
}

/*
    Helper function to count the number of occurances of a certain set of
    characters in a string.
*/
function instancesInString(str, ch) {
    let cnt = 0;
    for (let i = 0; i < str.length; i++) {
        if (str.charAt(i) == ch) {
            cnt++;
        }
    }
    return cnt;
}

/*
    Exctracts a tweet from a given sample.
*/
function extractTweet(sample) {
    let tweet = '';

    // Extract lines of dialog.
    const lines = sample.match(DIALOG_REGEX);

    // Get rid of lines that do not follow basic rules of punctuation or are
    // otherwise bad to tweet.
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (instancesInString(line, '(') != instancesInString(line, ')')) {
            // Make sure for every open parenthesis there is a closing parenthesis
            lines.splice(i, 1);
            i--;
        }
        else if (instancesInString(line, '"') != instancesInString(line, '"')) {
            // Make sure for every open quote there is a closing quote
            lines.splice(i, 1);
            i--;
        }
        else if (line.length > 140) {
            // Make sure the line is not too long.
            lines.splice(i, 1);
            i--;
        }
    }

    // Return null if a tweet cannot be extracted.
    if (lines.length <= 0) {
        return null;
    }

    // An ideal line count for the tweet.
    const targetLineCount = Math.sqrt(Math.random()) * 3;
    for (let i = 0; i < lines.length && i < targetLineCount && tweet.length < 140; i++) {
        tweet += lines[i];
    }

    // Return all but the last line break.
    return tweet.substr(0, tweet.length - 1);
}

/*
    Send a tweet.
*/
function sendTweet(tweet, client) {
    return new Promise((resolve, reject) => {
        client.post('statuses/update', { status: tweet }, (err, body, response) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(tweet);
            }
        });
    });
}

/*
    Sign in to the Twitter API. Resolves a twitter client object.
*/
function signIn() {
    return new Promise((resolve, reject) => {
        // Read the credential file.
        fs.readFile(path.join(__dirname, '..', 'secret', 'twitter-keys.json'), (err, data) => {
            if (err) {
                reject(err);
            }
            else {
                try {
                    // Parse and return the keys.
                    const keys = JSON.parse(data);
                    resolve(new Twitter(keys));
                }
                catch (err) {
                    reject(err);
                }
            }
        });
    });
}

/*
    Given a twitter client, this function will get a sampling from the RNN,
    then attempts to extract a tweet from the sample. Finally, send the tweet
    and resolve it.
*/
function buildAndSendTweet(client) {
    return new Promise((resolve, reject) => {
        // Get a sampling from a seed based on the current time with a length
        // of 2k.
        getSampling(Math.floor(Date.now() / 1000), 2000).then((str) => {
            // Try to extract a tweet from the sample.
            const tweet = extractTweet(str);

            if (!tweet) {
                // If a tweet could not be extracted, try again by calling
                // recursively.
                buildAndSendTweet(client).then((result) => {
                    resolve(result);
                }).catch((err) => {
                    reject(err);
                });
            }
            else {
                // Otherwise, send the tweet and resolve.
                resolve(sendTweet(tweet, client));
            }
        });
    });
}

/*
    Main function. First sign in. Then, on a 4 hour interval build and send
    tweets.
*/
module.exports = function() {
    signIn().then((twitterClient) => {
        setInterval(() => {
            buildAndSendTweet(twitterClient).then((tweet) => {
                console.log('--- New Tweet ---');
                console.log(tweet);
                console.log('-----------------');
            }).catch((err) => {
                console.log(err);
            });
        }, 1000 * 60 * 60 * 4);
        buildAndSendTweet(twitterClient);
    }).catch((err) => {
        console.log(err);
    });
};
