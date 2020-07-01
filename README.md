to run:

clone to local system

cd into repo

sudo npm install 

sudo npm start

(open browser to https://localhost:3000)

After a short load time,
you should be able to see samples from the emails I generated, loaded into a table.

Click the yellow button to run the spam filter

You can play with the sliders to tweak the bucketizing logic and probability scoring, there are more detailed explanations in the code itself

The code lives between App.js, which contains the UI code, and spamFilter.js, which is the logic of the filter itself.

Emails live in ./public/emails/<email#.txt>
If you would like to add more emails for it to evaluate, please add them in this naming convention and in the format that the other emails are written in.
(if you want me to make the fileIO portion of this solution more robust, please send me an email. It was not a priority as I was developing it)


Thank you for the challenge!
~MS

Questions, comments, feedback:
matthew.speller@tutanota.com
