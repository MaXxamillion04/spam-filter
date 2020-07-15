const { TestScheduler } = require("jest");
import "isomorphic-fetch";
var fs = require("fs").promises;
const sF = require("../spamFilter");
import { ExpansionPanelActions } from "@material-ui/core";
import { readFile } from "fs";

describe("Base Tests", () => {
  it("This returns true", () => {
    expect(true).toEqual(true);
  });
  it("This returns false", () => {
    expect(false).toEqual(false);
  });
});

async function mockFetch(filePath) {
  var output = fs.readFile(filePath, "utf8", function (err, data) {
    if (err) {
      console.log(err);
      //throw Error("Cannot read file at this path");
    }
    return data;
  });

  return output;
}


describe("mockFetch", () => {
  test("It can (mock) load a text file from a mock URL (local path)", (done) => {
    const input = process.cwd() + `/src/__tests__/emails/helloworld.txt`;
    const output = "Hello World!";

    (async () => {
      var bodyText = "";
      const filePromise = mockFetch(input);

      //console.log(filePromise);
      await filePromise;
      //console.log(filePromise);
      filePromise.then((data) => {
        bodyText = data;
        expect(bodyText).toEqual(output);

        done();
      });
    })();
  });
  /*test("It throws an error if no file exists", (done) => {
    const input = "some/bad/path.file";
    const errMsg = "Cannot read file at this path";
    async () => {
      var bodyText = await mockFetch(input);
      expect(bodyText).Error("Cannot read file at this path");
      done();
    };
  });*/
});

describe("Mocking FileIO", () => {
  test("Jest will redirect 'fetch' to our 'mockFetch' function", async (done) => {
    const input = process.cwd() + `/src/__tests__/emails/helloworld.txt`;
    const output = "Hello World!";

    const globalFetchMocker = jest
      .spyOn(global, "fetch")
      .mockImplementation(mockFetch);

    var bodyText = fetch(input);
    await bodyText;

    expect(globalFetchMocker).toHaveBeenCalledTimes(1);
    bodyText.then((data) => {
      expect(data).toEqual("Hello World!");
      done();
    });
  });

  test("It will call mocked getBodyTextPromise to get the local file data", async (done) => {
    const input = process.cwd() + `/src/__tests__/emails/helloworld.txt`;
    const output = "Hello World!";
    //const fetchMocker = jest.spyOn(global, "fetch").mockImplementation(mockFetch);

    var bodyText = sF.getBodyTextPromise(input);
    await bodyText;

    expect(fetchMocker).toHaveBeenCalledTimes(1);
    bodyText.then((data) => {
      expect(data).toEqual("Hello World!");
      done();
    });
  });
  test("getBodyTextPromise, will throw an error if it cannot find the file", async (done) => {
    const input = process.cwd() + `/src/__tests__/emails/junk`;
    const output = "no such file or directory";
    expect.assertions(2);

    try {
      var bodyText = sF.getBodyTextPromise(input);
      await bodyText;
    } catch (e) {
      expect(e.toString()).toMatch(output);
    }

    expect(fetchMocker).toHaveBeenCalledTimes(1);
    done();
  });
});

describe("stripBodyText", () => {
  it('will strip away the header and return just the bodyText "Hello World" from a formatted email file', async (done) => {
    const input =
      process.cwd() + `/src/__tests__/emails/helloWorldEmailFormat.txt`;
    const output = "Hello World";

    var emailText = sF.getBodyTextPromise(input);
    var emailData = await emailText;
    //console.log(emailData);

    expect(fetchMocker).toHaveBeenCalledTimes(1);

    var bodyText = sF.stripBodyText(emailData);
    //console.log("132 "+bodyText);
    expect(bodyText).toEqual("Hello World");
    done();
  });
  it("given an email file with an empty body, it will return an empty string", async (done) => {
    const input = process.cwd() + `/src/__tests__/emails/emptyBody.txt`;
    const output = "";

    var emailData = sF.getBodyTextPromise(input);
    var emailText = await emailData;

    expect(fetchMocker).toHaveBeenCalledTimes(1);

    var bodyText = sF.stripBodyText(emailText);
    expect(bodyText).toEqual("");
    done();
  });
  it("It will strip all non-alphanumeric-characters from the bodyText of a formatted email file", async (done) => {
    const input =
      process.cwd() + `/src/__tests__/emails/helloWorldSpecialChars.txt`;
    //H#el#lo W%or&ld!
    const output = "H el lo W or ld ";
    var emailText = sF.getBodyTextPromise(input);
    var emailData = await emailText;

    expect(fetchMocker).toHaveBeenCalledTimes(1);

    var bodyText = sF.stripBodyText(emailData);
    expect(bodyText).toEqual(output);
    done();
  });
  it("removes any excessive whitespace and replaces it with spaces", async (done) => {
    const input = process.cwd() + `/src/__tests__/emails/whitespaceEmail.txt`;
    const output = "";

    var emailData = sF.getBodyTextPromise(input);
    var emailText = await emailData;

    expect(fetchMocker).toHaveBeenCalledTimes(1);

    var bodyText = sF.stripBodyText(emailText);
    const whitespace = /\s\s+/g;
    expect(whitespace.test(bodyText)).toBe(false);
    done();
  });
  it("truncates the length of an email to the first 400 characters", async (done) => {
    const input = process.cwd() + `/src/__tests__/emails/giantEmail.txt`;
    const output = "";

    var emailData = sF.getBodyTextPromise(input);
    var emailText = await emailData;

    expect(fetchMocker).toHaveBeenCalledTimes(1);

    var bodyText = sF.stripBodyText(emailText);

    expect(bodyText.length <= 400).toBeTruthy();
    done();
  });
});

describe("splitIntoWords", () => {
  it("separates a string by spaces, and adds those words into a HashSet", () => {
    var input = "Hello Name Emily";
    var wordSet = new Set();

    sF.splitIntoWords(input, wordSet);

    var wordArray = input.split(" ");

    wordArray.forEach((word) => {
      expect(wordSet.has(word)).toBe(true);
    });
  });
  it("given an empty string, the Set remains empty", () =>{
    var input="";
    var wordSet = new Set();
    expect.assertions(0);
    sF.splitIntoWords(input,wordSet);
    wordSet.entries((word)=>{
      expect(true).toBe(false);
    })
  })
});

describe("scoreAndBucketize", ()=>{
  it("assigns a new bucket(wordset,bodylength) to the first email processed, with a similarity score of 0", ()=>{
    sF.resetFilter(sF.defaultSpamThreshold,sF.defaultSpamCount);
    expect(sF.getBuckets()).toEqual([]);

    var wordSet = new Set();
    const words = ["hello", "my", "name", "is", "Matt"];
    var length=0;
    words.forEach((word)=>{
      length+=word.length;
      wordSet.add(word);
    });
    expect(length>0).toBe(true);
    let output=sF.scoreAndBucketize(wordSet, length);

    expect(sF.getBuckets()).not.toEqual([]);
    expect(sF.getBuckets()[0].bodyLength).toEqual(length);
    expect(output.bucket).toEqual(0);
    expect(output.score).toEqual(0);

  });
  it("assigns a new bucket and score of 0 to a second email, that has no words in common to the first", ()=>{
    sF.resetFilter(sF.defaultSpamThreshold,sF.defaultSpamCount);
    expect(sF.getBuckets()).toEqual([]);

    var firstWordSet = new Set();
    const firstWords = ["hello", "my", "name", "is", "Matt"];
    var firstLength=0;
    firstWords.forEach((word)=>{
      firstLength+=word.length;
      firstWordSet.add(word);
    });
    expect(firstLength>0).toBe(true);
    let firstOutput=sF.scoreAndBucketize(firstWordSet, firstLength);

    expect(sF.getBuckets()).not.toEqual([]);
    expect(firstOutput.bucket).toEqual(0);
    expect(firstOutput.score).toEqual(0);

    var secondWordSet = new Set();
    const secondWords = ["goodbye", "your", "shoes", "are", "Blue"];
    var secondLength=0;
    secondWords.forEach((word)=>{
      secondLength+=word.length;
      secondWordSet.add(word);
    });
    expect(secondLength>0).toBe(true);
    let secondOutput=sF.scoreAndBucketize(secondWordSet, secondLength);

    expect(sF.getBuckets()).not.toEqual([]);
    expect(secondOutput.bucket).not.toEqual(0);
    expect(secondOutput.score).toEqual(0);
  })
  it("assigns a new bucket and score of 50 to a second email, that has exactly half its words in common to the first", ()=>{
    sF.resetFilter(sF.defaultSpamThreshold,sF.defaultSpamCount);//default values
    expect(sF.getBuckets()).toEqual([]);

    var firstWordSet = new Set();
    const firstWords = ["hello", "my", "name", "is", "Matt", "green"];
    var firstLength=0;
    firstWords.forEach((word)=>{
      firstLength+=word.length;
      firstWordSet.add(word);
    });
    expect(firstLength>0).toBe(true);
    let firstOutput=sF.scoreAndBucketize(firstWordSet, firstLength);

    expect(sF.getBuckets()).not.toEqual([]);
    expect(firstOutput.bucket).toEqual(0);
    expect(firstOutput.score).toEqual(0);

    var secondWordSet = new Set();
    const secondWords = ["hello", "my", "name", "are", "Blue", "yellow"];
    var secondLength=0;
    secondWords.forEach((word)=>{
      secondLength+=word.length;
      secondWordSet.add(word);
    });
    expect(secondLength>0).toBe(true);
    let secondOutput=sF.scoreAndBucketize(secondWordSet, secondLength);

    //console.log(sF.getBuckets());

    expect(secondOutput.bucket).not.toEqual(0);
    expect(secondOutput.score).toEqual(50);
  })
  it("given two distinct buckets, puts a third email into the first bucket which it is most similar to, with a score > threshold(70)",()=>{
    sF.resetFilter(sF.defaultSpamThreshold,sF.defaultSpamCount);//default values
    expect(sF.getBuckets()).toEqual([]);

    var firstWordSet = new Set();
    const firstWords = ["hello", "my", "name", "is", "Matt", "potatoes", "orange", "green"];
    var firstLength=0;
    firstWords.forEach((word)=>{
      firstLength+=word.length;
      firstWordSet.add(word);
    });
    expect(firstLength>0).toBe(true);
    let firstOutput=sF.scoreAndBucketize(firstWordSet, firstLength);

    expect(sF.getBuckets()).not.toEqual([]);
    expect(firstOutput.bucket).toEqual(0);
    expect(firstOutput.score).toEqual(0);


    var secondWordSet = new Set();
    const secondWords = ["goodbye", "your", "shoes", "are", "Blue"];
    var secondLength=0;
    secondWords.forEach((word)=>{
      secondLength+=word.length;
      secondWordSet.add(word);
    });
    expect(secondLength>0).toBe(true);
    let secondOutput=sF.scoreAndBucketize(secondWordSet, secondLength);

    expect(sF.getBuckets()).not.toEqual([]);
    expect(secondOutput.bucket).not.toEqual(0);
    expect(secondOutput.score).toEqual(0);

    var thirdWordSet = new Set();
    const thirdWords = ["hello", "my", "name", "is", "Matt", "potatoes", "orange", "yellow"];
    var thirdLength=0;
    thirdWords.forEach((word)=>{
      thirdLength+=word.length;
      thirdWordSet.add(word);
    });
    expect(thirdLength>0).toBe(true);
    let thirdOutput=sF.scoreAndBucketize(thirdWordSet, thirdLength);

    //console.log(sF.getBuckets());

    expect(thirdOutput.bucket).toEqual(0);
    expect(thirdOutput.score >=70).toBe(true);
    expect(sF.getBuckets()[0].emails).toEqual(2);
  })
  it("given two emails of perfectly matching word sets but significantly different length, it assigns each its own bucket",()=>{
    sF.resetFilter(sF.defaultSpamThreshold,sF.defaultSpamCount);
    expect(sF.getBuckets()).toEqual([]);

    var firstWordSet = new Set();
    const firstWords = ["hello", "my", "name", "is", "Matt"];
    var firstLength=0;
    firstWords.forEach((word)=>{
      firstLength+=word.length;
      firstWordSet.add(word);
    });
    expect(firstLength>0).toBe(true);
    let firstOutput=sF.scoreAndBucketize(firstWordSet, firstLength);

    expect(sF.getBuckets()).not.toEqual([]);
    expect(firstOutput.bucket).toEqual(0);
    expect(firstOutput.score).toEqual(0);

    //var secondWordSet = new Set();
    //const secondWords = ["hello", "my", "name", "is", "Matt"];
    var secondLength=firstLength * 6;
    
    expect(secondLength>0).toBe(true);
    let secondOutput=sF.scoreAndBucketize(firstWordSet, secondLength);

    expect(secondOutput.bucket).not.toEqual(0);
    expect(secondOutput.score <=sF.getSpamThreshold()).toEqual(true);
  })
  it("given 2 buckets, a new empty email will be given its own bucket", ()=>{
    sF.resetFilter(sF.defaultSpamThreshold,sF.defaultSpamCount);//default values
    expect(sF.getBuckets()).toEqual([]);

    var firstWordSet = new Set();
    const firstWords = ["hello", "my", "name", "is", "Matt", "potatoes", "orange", "green"];
    var firstLength=0;
    firstWords.forEach((word)=>{
      firstLength+=word.length;
      firstWordSet.add(word);
    });
    expect(firstLength>0).toBe(true);
    let firstOutput=sF.scoreAndBucketize(firstWordSet, firstLength);

    expect(sF.getBuckets()).not.toEqual([]);
    expect(firstOutput.bucket).toEqual(0);
    expect(firstOutput.score).toEqual(0);


    var secondWordSet = new Set();
    const secondWords = ["goodbye", "your", "shoes", "are", "Blue"];
    var secondLength=0;
    secondWords.forEach((word)=>{
      secondLength+=word.length;
      secondWordSet.add(word);
    });
    expect(secondLength>0).toBe(true);
    let secondOutput=sF.scoreAndBucketize(secondWordSet, secondLength);

    expect(sF.getBuckets()).not.toEqual([]);
    expect(secondOutput.bucket).not.toEqual(0);
    expect(secondOutput.score).toEqual(0);

    var thirdWordSet = new Set();
    //const thirdWords = ["hello", "my", "name", "is", "Matt", "potatoes", "orange", "yellow"];
    var thirdLength=0;
    /*thirdWords.forEach((word)=>{
      thirdLength+=word.length;
      thirdWordSet.add(word);
    });*/
    //expect(thirdLength>0).toBe(true);
    let thirdOutput=sF.scoreAndBucketize(thirdWordSet, thirdLength);
    //console.log(sF.getBuckets());

    expect(thirdOutput.bucket).toEqual(2);
    expect(thirdOutput.score).toBe(0);
    expect(sF.getBuckets()[0].emails).toEqual(1);

  })
  it("then, a second empty email will be bucketized with the first", ()=>{
    sF.resetFilter(sF.defaultSpamThreshold,sF.defaultSpamCount);//default values
    expect(sF.getBuckets()).toEqual([]);

    var firstWordSet = new Set();
    const firstWords = ["hello", "my", "name", "is", "Matt", "potatoes", "orange", "green"];
    var firstLength=0;
    firstWords.forEach((word)=>{
      firstLength+=word.length;
      firstWordSet.add(word);
    });
    expect(firstLength>0).toBe(true);
    let firstOutput=sF.scoreAndBucketize(firstWordSet, firstLength);

    expect(sF.getBuckets()).not.toEqual([]);
    expect(firstOutput.bucket).toEqual(0);
    expect(firstOutput.score).toEqual(0);


    var secondWordSet = new Set();
    const secondWords = ["goodbye", "your", "shoes", "are", "Blue"];
    var secondLength=0;
    secondWords.forEach((word)=>{
      secondLength+=word.length;
      secondWordSet.add(word);
    });
    expect(secondLength>0).toBe(true);
    let secondOutput=sF.scoreAndBucketize(secondWordSet, secondLength);

    expect(sF.getBuckets()).not.toEqual([]);
    expect(secondOutput.bucket).not.toEqual(0);
    expect(secondOutput.score).toEqual(0);

    var thirdWordSet = new Set();
    //const thirdWords = ["hello", "my", "name", "is", "Matt", "potatoes", "orange", "yellow"];
    var thirdLength=0;
    /*thirdWords.forEach((word)=>{
      thirdLength+=word.length;
      thirdWordSet.add(word);
    });*/
    //expect(thirdLength>0).toBe(true);
    let thirdOutput=sF.scoreAndBucketize(thirdWordSet, thirdLength);
    let fourthOutput=sF.scoreAndBucketize(thirdWordSet,thirdLength);

    //console.log(sF.getBuckets());

    expect(thirdOutput.bucket).toEqual(2);
    expect(thirdOutput.score).toBe(0);
    expect(sF.getBuckets()[0].emails).toEqual(1);

    expect(fourthOutput.bucket).toEqual(2);
    expect(fourthOutput.score).toBe(100);
    expect(sF.getBuckets()[2].emails).toEqual(2);
  })
  it("a bucket with an empty email does not disrupt further inputs", ()=>{
    sF.resetFilter(sF.defaultSpamThreshold,sF.defaultSpamCount);//default values
    expect(sF.getBuckets()).toEqual([]);

    var firstWordSet = new Set();
    const firstWords = ["hello", "my", "name", "is", "Matt", "potatoes", "orange", "green"];
    var firstLength=0;
    firstWords.forEach((word)=>{
      firstLength+=word.length;
      firstWordSet.add(word);
    });
    expect(firstLength>0).toBe(true);
    let firstOutput=sF.scoreAndBucketize(firstWordSet, firstLength);

    expect(sF.getBuckets()).not.toEqual([]);
    expect(firstOutput.bucket).toEqual(0);
    expect(firstOutput.score).toEqual(0);


    var secondWordSet = new Set();
    const secondWords = ["goodbye", "your", "shoes", "are", "Blue"];
    var secondLength=0;
    secondWords.forEach((word)=>{
      secondLength+=word.length;
      secondWordSet.add(word);
    });
    expect(secondLength>0).toBe(true);
    let secondOutput=sF.scoreAndBucketize(secondWordSet, secondLength);

    expect(sF.getBuckets()).not.toEqual([]);
    expect(secondOutput.bucket).not.toEqual(0);
    expect(secondOutput.score).toEqual(0);

    var thirdWordSet = new Set();
    //const thirdWords = ["hello", "my", "name", "is", "Matt", "potatoes", "orange", "yellow"];
    var thirdLength=0;
    
    //expect(thirdLength>0).toBe(true);
    let thirdOutput=sF.scoreAndBucketize(thirdWordSet, thirdLength);
    //console.log(sF.getBuckets());

    expect(thirdOutput.bucket).toEqual(2);
    expect(thirdOutput.score).toBe(0);
    expect(sF.getBuckets()[0].emails).toEqual(1);

    var fourthWordSet = new Set();
    const fourthWords = ["pepper", "salt", "your", "shoes", "are", "orange", "red"];

    var fourthLength = 70;
    fourthWords.forEach((word)=>{
      //fourthLength+=word.length;
      fourthWordSet.add(word);
    });

    let fourthOutput = sF.scoreAndBucketize(fourthWordSet,fourthLength);
    
    expect(fourthOutput.bucket>2).toBe(true);
    expect(fourthOutput.score<=70).toBe(true);
  })

});

describe("assignProbability", ()=>{
  it("assigns a probability score based on the number of emails in bucket/spamCount", ()=>{
    sF.resetFilter(sF.defaultSpamThreshold,sF.defaultSpamCount);//default values
    expect(sF.getBuckets()).toEqual([]);

    var firstWordSet = new Set();
    const firstWords = ["hello", "my", "name", "is", "Matt", "potatoes", "orange", "green"];
    var firstLength=0;
    firstWords.forEach((word)=>{
      firstLength+=word.length;
      firstWordSet.add(word);
    });
    expect(firstLength>0).toBe(true);
    let firstOutput=sF.scoreAndBucketize(firstWordSet, firstLength);

    expect(sF.getBuckets()).not.toEqual([]);
    expect(firstOutput.bucket).toEqual(0);
    expect(firstOutput.score).toEqual(0);

    var firstProb = sF.assignProbability(firstOutput.bucket,firstOutput.score);
    expect(firstProb <= 25).toBe(true);
  })
  it("assigns a probability score 80% based on the number of emails in bucket/spamCount , 20% based on similarity score/100", ()=>{
    sF.resetFilter(sF.defaultSpamThreshold,sF.defaultSpamCount);//default values
    expect(sF.getBuckets()).toEqual([]);

    var firstWordSet = new Set();
    const firstWords = ["hello", "my", "name", "is", "Matt", "potatoes", "orange", "green"];
    var firstLength=0;
    firstWords.forEach((word)=>{
      firstLength+=word.length;
      firstWordSet.add(word);
    });
    expect(firstLength>0).toBe(true);
    let firstOutput=sF.scoreAndBucketize(firstWordSet, firstLength);

    expect(sF.getBuckets()).not.toEqual([]);
    expect(firstOutput.bucket).toEqual(0);
    expect(firstOutput.score).toEqual(0);

    var firstProb = sF.assignProbability(firstOutput.bucket,firstOutput.score);
    expect(firstProb <= 25).toBe(true);

    var secondWordSet = new Set();
    var secondLength=0;
    const secondWords = ["hello", "my", "name", "is", "Matt", "potatoes", "orange"];
    secondWords.forEach((word)=>{
      secondLength+=word.length;
      secondWordSet.add(word);
    });
    expect(secondLength>0).toBe(true);
    let secondOutput=sF.scoreAndBucketize(secondWordSet, secondLength);

    expect(sF.getBuckets()).not.toEqual([]);
    expect(secondOutput.bucket).toEqual(0);
    expect(secondOutput.score).not.toEqual(0);

    let secondProb = sF.assignProbability(secondOutput.bucket,secondOutput.score);
    expect(secondProb).toEqual(52);
  });
  it("assigns a score between 80-100 when a bucket is == the spamCount",()=>{
    sF.resetFilter(sF.defaultSpamThreshold,sF.defaultSpamCount);//default values
    expect(sF.getBuckets()).toEqual([]);
    var firstWordSet = new Set();
    const firstWords = ["hello", "my", "name", "is", "Matt", "potatoes", "orange", "green"];
    var firstLength=0;
    firstWords.forEach((word)=>{
      firstLength+=word.length;
      firstWordSet.add(word);
    });
    expect(firstLength>0).toBe(true);
    let firstOutput=sF.scoreAndBucketize(firstWordSet, firstLength);
    var firstProb = sF.assignProbability(firstOutput.bucket,firstOutput.score);
    expect(firstProb <= 25).toBe(true);
    firstOutput=sF.scoreAndBucketize(firstWordSet, firstLength);
    firstOutput=sF.scoreAndBucketize(firstWordSet, firstLength);
    firstOutput=sF.scoreAndBucketize(firstWordSet, firstLength);
    firstOutput=sF.scoreAndBucketize(firstWordSet, firstLength);
    //let firstOutput=sF.scoreAndBucketize(firstWordSet, firstLength);

    var finalProb = sF.assignProbability(firstOutput.bucket,firstOutput.score);
    expect(finalProb >= 80).toBe(true);
  })
  it("assigns a score of 100 if a probability score would be over 100",()=>{
    sF.resetFilter(sF.defaultSpamThreshold,sF.defaultSpamCount);//default values
    expect(sF.getBuckets()).toEqual([]);
    var firstWordSet = new Set();
    const firstWords = ["hello", "my", "name", "is", "Matt", "potatoes", "orange", "green"];
    var firstLength=0;
    firstWords.forEach((word)=>{
      firstLength+=word.length;
      firstWordSet.add(word);
    });
    expect(firstLength>0).toBe(true);
    let firstOutput=sF.scoreAndBucketize(firstWordSet, firstLength);
    var firstProb = sF.assignProbability(firstOutput.bucket,firstOutput.score);
    expect(firstProb <= 25).toBe(true);
    firstOutput=sF.scoreAndBucketize(firstWordSet, firstLength);
    firstOutput=sF.scoreAndBucketize(firstWordSet, firstLength);
    firstOutput=sF.scoreAndBucketize(firstWordSet, firstLength);
    firstOutput=sF.scoreAndBucketize(firstWordSet, firstLength);
    firstOutput=sF.scoreAndBucketize(firstWordSet, firstLength);
    firstOutput=sF.scoreAndBucketize(firstWordSet, firstLength);
    firstOutput=sF.scoreAndBucketize(firstWordSet, firstLength);
    firstOutput=sF.scoreAndBucketize(firstWordSet, firstLength);
    firstOutput=sF.scoreAndBucketize(firstWordSet, firstLength);
    //let firstOutput=sF.scoreAndBucketize(firstWordSet, firstLength);

    var finalProb = sF.assignProbability(firstOutput.bucket,firstOutput.score);
    expect(finalProb >= 100).toBe(true);
  })
})

const fetchMocker = jest
  .spyOn(sF, "getBodyTextPromise")
  .mockImplementation(mockFetch);


afterEach(() => {
  jest.clearAllMocks();
});
