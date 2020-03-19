const fs = require('fs');
const path = require('path');

// Enum for states.
const STATES = {
    START: 0,
    BREAK: 1,
    SHOT: 2,
    DIRECTION: 3,
    DIALOG: 4
};

// Regex to determine the type of a line of text.
const REGEX = {
    SHOT: /^[0-9]+\s/, // If the line is a shot declaration
    DIALOG: /^\t{5}[A-Z]/, // If the line is the start of dialog
    DIRECTION: /^\t[A-Z,a-z,0-9]/, // If the line is stage direcitons
    BREAK: /^\s*$/, // If the line is a line break
    GARBAGE: /^[^a-z]*$/ // If the line is nothing
};

/*
    Parse a single file. Resolve a string of all the dialog found in the file.
*/
function parseFile(file) {
    return new Promise((resolve, reject) => {
        let str = '';
        fs.readFile(file, 'utf8', (err, data) => {
            if (err) {
                reject(err);
            }
            else {

                // The current state.
                let state = STATES.START;

                // Has a new shot begun. Often times, stage directions are based
                // on context in the shot description. Because shot directions are
                // not being included, these directions should not be included.
                let isNewShot = false;

                // Iterate through lines.
                const lines = data.split(new RegExp('[' + String.fromCharCode(10) + ',' + String.fromCharCode(13) + ']', 'g'));
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];

                    switch (state) {
                        case STATES.START:
                            {
                                // Start state.

                                if (REGEX.SHOT.test(line)) {
                                    // Test for match with new shot.
                                    state = STATES.SHOT;
                                    isNewShot = true;
                                }
                            }
                            break;
                        case STATES.BREAK:
                            {
                                // Line break state.

                                if (REGEX.SHOT.test(line)) {
                                    // Test for match with new shot.
                                    state = STATES.SHOT;
                                    isNewShot = true;
                                }
                                else if (REGEX.DIALOG.test(line)) {
                                    // Test for match with dialog.
                                    state = STATES.DIALOG;

                                    // Add to stream.
                                    str += line.trim() + ': ';
                                }
                                else if (REGEX.DIRECTION.test(line) && !REGEX.GARBAGE.test(line)) {
                                    // Test matches with direction.
                                    state = STATES.DIRECTION;

                                    // Add to stream.
                                    // stream.write(line.trim() + ' ');
                                }
                            }
                            break;
                        case STATES.SHOT:
                            {
                                // New shot state.

                                if (REGEX.BREAK.test(line)) {
                                    // Go to line break state.
                                    state = STATES.BREAK;
                                }
                            }
                            break;
                        case STATES.DIRECTION:
                            {
                                // Direction state.

                                if (REGEX.BREAK.test(line)) {
                                    // Go to line break state.
                                    // stream.write('\n');
                                    state = STATES.BREAK;
                                    isNewShot = false;
                                }
                                else if (isNewShot) {
                                    // Add to stream.
                                    // stream.write(line.trim() + ' ');
                                }
                            }
                            break;
                        case STATES.DIALOG:
                            {
                                // Dialog.

                                if (REGEX.BREAK.test(line)) {
                                    // Go to line break state.
                                    str += '\n';
                                    state = STATES.BREAK;
                                }
                                else {
                                    // Add to stream.
                                    str += line.trim() + ' ';
                                }
                            }
                            break;

                    }
                }
            }

            resolve(str);
        });
    });
}

/*
    Main function to build a single data file. Compiles dialog from all files
    in the raw directory.
*/
function buildData() {
    const dataPath = path.join(__dirname, '..', 'data', 'raw', 'tng');

    // Find the files in the directory.
    fs.readdir(dataPath, (err, files) => {
        if (err) {
            throw err;
        }

        // Open a write stream.
        const stream = fs.createWriteStream(path.join(__dirname, '..', 'data', 'input.txt'), 'utf8');

        // Make sure there are files.
        if (files.length <= 0) {
            throw new Error('No files in directory');
        }

        // Parse files.
        let ind = 0;
        let parse = function() {
            parseFile(path.join(dataPath, files[ind])).then((str) => {
                ind++;
                if (ind < files.length) {
                    // Write the string to the stream.
                    let skipDrain = stream.write(str, 'utf8');
                    if (skipDrain) {
                        // If no draining is needed, parse right away.
                        parse();
                    }
                    else {
                        // Otherwise, parse on drain.
                        stream.once('drain', () => {
                            parse();
                        });
                    }
                }
            }).catch((err) => {
                throw err;
            });
        };

        // Parse as soon as the file opens.
        stream.on('open', () => {
            parse();
        });

        // Handle errors.
        stream.on('error', (err) => {
            console.log(err);
        });

    });
}

module.exports = buildData;
