# TNG Fever Dreams
This program has two functions. The first is to parse script files into a single raw dialog file. The second is to post Ai written dialog to Twitter.

## Setup
 - After cloning the repository, download screenplay files (I'm sure you can use Google to find some) and put them in the directory "data/raw/tng/".
 - Clone Andrej Karpathy's RNN (https://github.com/karpathy/char-rnn) into the directory "lib/char-rnn/"
 - Use "npm install" to install packages.
 - Create a folder "secret" and in the directory create a file "twitter-keys.json". This is a JSON file with string keys and values for "consumer_key", "consumer_secret", "access_token_key", "access_token_secret".
 
## Building data
Usage: "node . data"<br />
<br />
This will create a file input.txt in the data directory. You can use this file to train the neural network by moving it into "lib/char-rnn/data". I used the following command to do this (int he "lib/char-rnn" directory):<br />
th train.lua -data_dir data -rnn_size 1024 -num_layers 3<br />
This trains the network with 1024 nodes in size and with 3 layers. This will generate a checkpoint file every 1000 iterations. Once you have found a checkpoint with a suitably low loss, you can rename it "checkpoint.t7" and move it into "data/"<br />

## Tweeting
Usage: "node . tweet"<br />
<br />
This will send and report a tweet every 4 hours.