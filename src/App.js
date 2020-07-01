import React, { useEffect, useState } from "react";
import logo from "./logo.svg";
import "./App.css";
import Button from "react-bootstrap/Button";
import Slider from "@material-ui/core/Slider";
//import { filterSpam } from "./filterSpam.js";
import { CircularProgress } from "@material-ui/core";
import filterSpam, {resetFilter, assignProbability} from "./spamFilter";

function App() {
  const [emailArray, updateEmailArray] = useState([]);
  const [spamValue, setSpamValue] = useState(70);
  const [spamBucketCount, setSpamBucketCount]=useState(5);

  //const SpamFilter=require('./spamFilter');
  /*
  this useEffect block populates the table with samples from each email file.
  It is called on the initial render of the page
  It also acts as a scanner to determine how many email files we have

  This is just for the UI of this, the actual filter code lives in filterSpam.js

  */
  useEffect(async () => {
    var newEmailArray = [];
    var moreFiles = true;
    for (var x = 0; moreFiles; x++) {
      var header, sample;
      var file = await fetch(`/emails/email${x}.txt`)
        .then((r) => r.text())
        .then((text) => {

          var lines = text.split("\n");

          //this is what terminates our for loop, and stops the scan for more email files
          // If there is no file at the address being fetched,
          // JS will automatically fetch a template HTML file with this as the first line
          // when that happens, we are done.
          if (lines[0] === "<!DOCTYPE html>") {
            moreFiles = false;
          } else {
            //this will catch if the file isnt formatted right. Bucket===0 will be used to prevent that file from being scanned later on
            if (lines[0] !== "header:") {
              console.log("This email file is not in the correct format:"+x);

              newEmailArray[x] = {
                header: "Could not read file!",
                bodySample: "error",
                charLength: 0,
                score: 100,
                bucket: -1,
                probability: 100,
                scored: true,
              };
            } else {
              //if the file is formatted correctly, strip a sample of the data!
              var head = lines[1].substring(0, 24);
              if (lines[1].length > 24) {
                head += "...";
              }
              var bodySample;
              if (lines[3] && lines[3].length > 16) {
                bodySample = lines[3].substring(0, 16) + "...";
              } else {
                if (lines[3]) bodySample = lines[3];
                else bodySample = "#error#";
              }

              //character length of just the body means subtracting the length of the header and placeholders for "header" and "body"
              var charL =
                text.length -
                lines[0].length -
                lines[1].length -
                lines[2].length;
              newEmailArray[x] = {
                header: head,
                sample: bodySample,
                charLength: charL,
                score: 0,
                bucket: "N/A",
                probability: 0,
                scored: false,
              };
            }
          }
        });
      updateEmailArray([...newEmailArray]);
    }
  }, []);

/*
debugging code  
  useEffect(()=>{
    console.log(emailArray);
  },[emailArray]);
*/
  /*
  this creates the components for the UI table, which displays the results of the SpamFilter
  */
  function populateEmailTable() {
    if (emailArray.length === 0) {
      return (
        <tr>
          <td>
            <CircularProgress />
          </td>
          <td>
            <CircularProgress />
          </td>
          <td>
            <CircularProgress />
          </td>
          <td>
            <CircularProgress />
          </td>
          <td>
            <CircularProgress />
          </td>
          <td>
            <CircularProgress />
          </td>
        </tr>
      );
    }
    // var tableData="";

    return emailArray.map((emailRow, key) => {
      //var thisColor = emailRow.score < spamValue ? "green" : "red";

      var isit=(function(){
        if(emailRow.probability<50)
          return "NOPE";
          if(emailRow.probability <80)
          return "POSSIBLY"
          if(emailRow.probability>=80)
          return "YEP"
      })();
      return (
        <tr key={key}>
          <td>{emailRow.header}</td>
          <td>{emailRow.sample}</td>
          <td>{emailRow.charLength}</td>
          <td>{emailRow.score}</td>
          <td>{emailRow.bucket}</td>
          <td>{emailRow.probability}%</td>
          <td>
            
              {emailRow.scored
                ? isit
                : "NOT FILTERED YET!"}
          </td>
        </tr>
      );
    });
  }

  const handleSliderChange = (event, newValue) => {
    setSpamValue(newValue);
  };

  const handleSpamBucketCountSliderChange = (event, newValue) =>{
    setSpamBucketCount(newValue);
  }

/*  async function makeItWait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}*/


  
  async function activateSpamFilter (e) {
    resetFilter(spamValue,spamBucketCount);
    e.preventDefault();
    var newEmailArray=[];

    Promise.all(emailArray.map( async function(emailRow,index){

      if (emailRow.bucket !== -1) {
          
          var newEmailVals= await filterSpam(`/emails/email${index}.txt`);
          emailRow.bucket=newEmailVals.bucket;
          emailRow.score=newEmailVals.score;
          emailRow.scored=true;

          
          newEmailArray[index]=emailRow;

          

        }else{
          newEmailArray[index]=emailRow;
        }    

    })).then(()=>{

      Promise.all(newEmailArray.map( async function(emailRow,index){
        if(emailRow.bucket!==-1){
          emailRow.probability= await assignProbability(emailRow.bucket,emailRow.score);

          newEmailArray[index]=emailRow;
        }
      })).then(()=>{

      updateEmailArray(newEmailArray);
      }
      ).catch((err)=> console.log(err));
    });    
    
  }

  const scoreMarks=[
    {value: 0,
    label:"0"},
    {value:100,
    label:"100"},
    {value: 70,
    label:"70"}
  ];
  const similarMarks=[
    {value: 0,
      label:"0"},
      {value:10,
      label:"10"},
      {value: 5,
      label:"5"}
  ]

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <table style={{ width: "100%" }}>
          <thead>
            <tr>
              <th>Header</th>
              <th>Body Sample</th>
              <th>Length</th>
              <th>Similarity Score</th>
              <th>Spam Bucket</th>
              <th>Spam Probability</th>
              <th>Is It Spam?</th>
            </tr>
          </thead>
          <tbody>{populateEmailTable()}</tbody>
        </table>
        <Button onClick={(event)=>activateSpamFilter(event)} variant="warning" size="lg">FILTER THESE EMAILS!</Button>
        <span>How similar is too similar?</span>
        <Slider
          className="slider"
          aria-labelledby="discrete-slider"
          valueLabelDisplay="auto"
          value={spamValue}
          step={5}
          marks={scoreMarks}
          min={0}
          max={100}
          onChange={handleSliderChange}
        />
        <span>How many similar emails constitutes "Spam"?</span>
        <Slider
          className="slider"
          aria-labelledby="discrete-slider"
          valueLabelDisplay="auto"
          value={spamBucketCount}
          step={1}
          marks={similarMarks}
          min={0}
          max={10}
          onChange={handleSpamBucketCountSliderChange}
        />
        <br />
        <br />
        <br />
      </header>
    </div>
  );
}

export default App;
