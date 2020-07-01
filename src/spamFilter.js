const commonWords = ["hello", "goodbye", "greetings", "sincerely"];
var buckets = [];

var spamThreshold = 70;
var spamCount = 5; //number of similar emails needed to constitute "Spam"

/*
here is the actual spam filtering/bucketizing logic
The process is as thus:
1. get the body text from the file
2. remove all symbols and excessive whitespace to compare only alphanumeric words, solely for the sake of logical simplicity
3. strip the first 400 characters of the email to compare contents. This could be changed to be more if it was determined to be a point of weakness
4. add all words from the body into a hashset, which is a set of all unique words in the email
//the contents are then checked against all previous data that has been processed, and bucketized:
5. Scoring part 1: how similar the words of this email are versus previous filtered emails, which have been sorted into "buckets"
6. Scoring part 2: how does the length of this email compare to the original email of the bucket? If it is not within 30%, the score is reduced, by up to half
//done scoring
7. the greatest score among all buckets is checked against the "spamValue" threshold, which is passed in from the App(70% is the default, similar enough to be considered spam)
7a. if the score is greater than the threshold, the email is put in the same bucket and is possibly spam.
7b. if the score is below threshold, the email gets its own "bucket" to be checked against future 
8. finally, the bucket email count is incremented, and the score and bucket # are passed back to the app
*/
export default async function filterSpam(filePath) {
  //init
  var score = 0;
  var bucket = 0;
  var emailSet = new Set();
  //1. get the body text from the file
  var file = await fetch(filePath)
    .then((r) => r.text())
    .then((text) => {
      var bodyText = text.split("\n");
      bodyText.shift();
      bodyText.shift();
      bodyText.shift();

      bodyText = bodyText.join(" ");
      //now bodyText contains only the body of the email

      //2. removing all non-alphanumeric characters and whitespace
      bodyText = bodyText.replace(/[^A-Za-z0-9]/gim, " ").replace(/\s+/g, " ");

      //save the length of our body for scoring in step 6 later
      var bodyLength = bodyText.length;

      //3. we are only going to check the first 400 characters of each email.
      //If their first 400 characters don't match significantly enough,
      //its not likely the rest of the contents are the same either
      //Note: This could be changed if it was determined to be a point of weakness, but currently optimizes for computation time using a reduced dataset
      bodyText.substring(0, 400);

      //4. split the text into an array of words. all words will be separated by one space due to the regex in step 2
      bodyText = bodyText.split(" ");
      //add all words to the Set
      bodyText.forEach((word, index) => {
        emailSet.add(word);
      });

      var maxScore = 0;
      var maxBucketIndex = 0;

      /*5.
      Get initial score, by taking the set of words from the email, taking the size, then removing all the words from the bucket word set
      the score is a ratio of endSize/startSize, so remaining words / starting words, then scaled up to be a percentage out of 100.
      */
      if (buckets.length !== 0) {
        buckets.forEach((bucket, index) => {
          var thisScore = 0;
          //emailSet is copied, and left intact, to be used for generating a bucket in step 7b below
          var copySet = new Set(emailSet);
          var startSize = copySet.size;

          //delete all similar words found in the bucket word set
          bucket.wordSet.forEach((word) => {
            copySet.delete(word);
          });
          var endSize = copySet.size;

          //calculate the ratio, scale to 100, take the difference out of 100 to get % similarity
          thisScore = 100 - (100 * endSize) / startSize;

          /* 6. modify score by length
        //if the email is not within 30% the length of the buckets email length, there is a score reduction, up to half, 
        //since they are deemed to be not so similar
        reasoning: there may be highly variable length spam emails, but I dont want them to catch non-spam emails unnecessarily
        if someone submitted an email that was a complete English dictionary, and it was bucketized, it could flag all following emails as spam,
        therefore, I determined that the length of the email needs to be factored into the score as well
        */
          var bucketLength = bucket.bodyLength;
          if (
            !(
              bodyLength <= bucketLength * 1.3 &&
              bodyLength >= bucketLength * 0.7
            )
          ) {
            thisScore =
              bodyLength > bucketLength
                ? thisScore * (0.5 + 0.5 * (bucketLength / bodyLength))
                : thisScore * (0.5 + 0.5 * (bodyLength / bucketLength));
          }

          /*get max score among all buckets, and keep track of which bucket index scored highest*/
          if (thisScore > maxScore) {
            maxScore = thisScore;
            maxBucketIndex = index;
          }
        });

        /*7. checks if score is above the spamThreshold to be similar enough to constitute 'spam'. 
        This value comes from the first slider in the app, defaults to 70
        */
        if (maxScore < spamThreshold) {
          //if it is not similar enough to any current buckets, it creates a new bucket for itself
          var newBucket = {
            wordSet: emailSet,
            bodyLength: bodyLength,
            emails: 1,
          };
          buckets.push(newBucket);
          maxBucketIndex = buckets.length - 1;
        } else {
          //If it is similar enough, it is added to the bucket that it scored highest with
          buckets[maxBucketIndex].emails++;
          //Note:, it is possible to add code here to update the buckets with new words as it is filled with more emails,
          //to account for the small differenced spammers use to circumnavigate filters
          //I did not take the logic that far in this implementation
        }
      } else {
        //there are no buckets yet, so the first email gets its own
        var newBucket = { wordSet: emailSet, emails: 1 };
        buckets.push(newBucket);
        maxBucketIndex = 0;
      }
      //score is rounded to 2 decimal places
      score = Math.round(100 * maxScore) / 100;
      bucket = maxBucketIndex;
    });

  return { bucket: bucket, score: score };
}

/*
Here is where the probability of spam is assigned.
The logic here is simple: if there are too many emails in a bucket, they should ALL be flagged as spam
20% of probability is similarity score, calculated during bucketization above, 80% is determined by # of emails in the bucket
It is just a flat ratio of emails in bucket / (number of similar emails needed to flag something as spam) or 100
*/
export function assignProbability(bucketNum, score) {
  console.log(buckets[bucketNum].emails + " " + spamCount);
  var prob = 20 * (score / 100) + 80 * (buckets[bucketNum].emails / spamCount);
  prob = Math.round(100 * prob) / 100;
  return prob > 100 ? 100 : prob;
}

/*resets buckets each time*/
export function resetFilter(spamScore, spamC) {
  buckets = [];
  spamThreshold = spamScore;
  spamCount = spamC;
}
