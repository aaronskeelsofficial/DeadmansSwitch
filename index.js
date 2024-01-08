const express = require('express');
const fs = require('fs');
const app = express();
const beautify = require("json-beautify");
var nodemailer = require('nodemailer');

const _HOMEDIR = "/home/runner/DeadmansSwitch/";
const _DEBUG = false;
const _ENABLEWARNINGMESSAGES = true;

// let checkpointDate = new Date(2022,3,15);
if(process.argv[2] == 1)
  fs.writeFileSync(_HOMEDIR + "/startuptime.txt", new Date().getTime() + "");
let checkpointDate = new Date(parseInt(fs.readFileSync(_HOMEDIR + "/startuptime.txt", 'utf8')));
let offsetSeconds = (30*2)*24*60*60;
let testingOffsetSeconds = (30*2)*24*60*60;
let dateToInitiateDeadman = new Date(checkpointDate.getTime() + (offsetSeconds * 1000));
let testingDateToInitiateDeadman = new Date(checkpointDate.getTime() + (testingOffsetSeconds * 1000));
let firedDeadman = false;
let firedWarning1 = false, firedWarning2 = false, firedWarning3 = false, firedWarning4 = false;
let dateToUse = !_DEBUG ? dateToInitiateDeadman : testingDateToInitiateDeadman;
  console.log("Startup date to fire deadman: " + dateToUse.toLocaleString('en-US', {timeZone: 'America/Los_Angeles'}));
  let timeToUse = dateToUse.getTime();
  let deltaTime = timeToUse - checkpointDate.getTime();
  console.log("First warning on: " + new Date(Math.round(checkpointDate.getTime() + deltaTime*.5)).toLocaleString('en-US', {timeZone: 'America/Los_Angeles'}));
  console.log("Second warning on: " + new Date(Math.round(checkpointDate.getTime() + deltaTime*.75)).toLocaleString('en-US', {timeZone: 'America/Los_Angeles'}));
  console.log("Third warning on: " + new Date(Math.round(checkpointDate.getTime() + deltaTime*.9)).toLocaleString('en-US', {timeZone: 'America/Los_Angeles'}));
  console.log("Fourth warning on: " + new Date(Math.round(checkpointDate.getTime() + deltaTime*.95)).toLocaleString('en-US', {timeZone: 'America/Los_Angeles'}));
fs.appendFile(_HOMEDIR + "StartedWithoutPermission.txt", "\n" + new Date().toLocaleString('en-US', {timeZone: 'America/Los_Angeles'}), () => {});

app.get('/', (req, res) => {
  if(req.query.code == process.env.ACCESSKEY){
    res.sendFile(_HOMEDIR + "/public/index.html");
    if(!_DEBUG){
      dateToInitiateDeadman = new Date(new Date().getTime() + (offsetSeconds * 1000));
      console.log("Updated date to fire deadman: " + dateToInitiateDeadman.toLocaleString('en-US', {timeZone: 'America/Los_Angeles'}) + " (on" + new Date().toLocaleString('en-US', {timeZone: 'America/Los_Angeles'}) + ")");
    }else{
      testingDateToInitiateDeadman = new Date(new Date().getTime() + (testingOffsetSeconds * 1000));
      console.log("Updated date to fire deadman: " + testingDateToInitiateDeadman.toLocaleString('en-US', {timeZone: 'America/Los_Angeles'}) + " (on " + new Date().toLocaleString('en-US', {timeZone: 'America/Los_Angeles'}) + ")");
    }
    fs.writeFileSync(_HOMEDIR + "/startuptime.txt", new Date().getTime() + "");
    checkpointDate = new Date();
  }else if(req.query.msg == process.env.MESSAGEKEY){
    res.set('Content-Type', 'text/html');
    res.send("<p style=\"white-space: pre-line;\">" + (!_DEBUG ? process.env.MESSAGEBODY : process.env.MESSAGEBODY_TESTING) + "</p>");
  }else{
    res.send("Nope");
  }
});

app.get('/emailgen', (req, res) => {
  let num = req.query.num;
  if(num == null){
    res.send("");
    return;
  }
  let s = {};
  
  s.ATT = num + "@mms.att.net";
  s.CRICKET = num + "@mms.mycricket.com";
  s.GOOGLEFI = num + "@msg.fi.google.com";
  s.METROPCS = num + "@mymetropcs.com";
  s.MINTMOBILE = num + "@mintmobile.com";
  s.SPRINT = num + "@messaging.sprintpcs.com";
  s.TMOBILE = num + "@tmomail.net";
  s.VERIZON = num + "@vzwpix.com";
//  s.VISIBLE = ""; //Copies verizon
//  s.XFINITY = ""; //Copies verizon

  console.log(s);
  console.log(JSON.stringify(s, null, 2));
  res.header("Content-Type",'application/json');
  res.send(JSON.stringify(s, null, 2));
});

app.listen(3000, () => {
});

var transporter = nodemailer.createTransport({
  service: 'zoho',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

let intervalID = setInterval(() => {
  let backupSafetyDate = new Date(2022, 5, 13); //Month index is one behind (June is 5 not 6)
  if(new Date().getTime() < backupSafetyDate.getTime()){
    return; //Safety feature can only fire deadman past June 13th 2022
  }
  
  let dateToUse = !_DEBUG ? dateToInitiateDeadman : testingDateToInitiateDeadman;
  let timeToUse = dateToUse.getTime();
  let curTime = new Date().getTime();
  let deltaTime = timeToUse - checkpointDate.getTime();
  if(curTime >= timeToUse){
    if(firedDeadman){
      clearInterval(intervalID);
      return;
    }
    
    console.log("Fired");
    let database = !_DEBUG ? JSON.parse(process.env.CONTACTS) : JSON.parse(process.env.CONTACTS_TESTING);
    // console.log(JSON.stringify(database, null, 2));
    let to = ""
    for (const [name, emailListDb] of Object.entries(database)) {
      console.log("Considering emails to " + name);
      for (const [identifier, email] of Object.entries(emailListDb)) {
        console.log(" - " + email);
        to = to + email + ",";
      }
      
    }
    to = to.substring(0, to.length - 1);
    var mailOptions = {
      from: process.env.EMAIL_USER,
      to: to,
      subject: "Aaron's Deadman Switch",
      text: (!_DEBUG ? process.env.MESSAGE : process.env.MESSAGE_TESTING).replace("%key%", process.env.MESSAGEKEY)
    };
    console.log("Sending Email.");
    transporter.sendMail(mailOptions, function(error, info){
      if (error) {
        console.log(error);
      } else {
        console.log('Email sent: ' + info.response);
      }
    });

    firedDeadman = true;
    // setTimeout(() => {
    //   // process.kill(1);
    //   fakeFunctionThatCrashesTheCodeSoNoSpam();
    // }, 3000);
  }

  //Fire warning messages to my phone and emails in case I forgot.
  if(_ENABLEWARNINGMESSAGES 
    && ((curTime - checkpointDate.getTime() >= deltaTime*.5 && !firedWarning1)
    || (curTime - checkpointDate.getTime() >= deltaTime*.75 && !firedWarning2)
    || (curTime - checkpointDate.getTime() >= deltaTime*.9 && !firedWarning3)
    || (curTime - checkpointDate.getTime() >= deltaTime*.95 && !firedWarning4))){
    if(!firedWarning1)
      firedWarning1 = true;
    else{
      if(!firedWarning2)
        firedWarning2 = true;
      else{
        if(!firedWarning3)
          firedWarning3 = true;
        else{
          if(!firedWarning4)
            firedWarning4 = true;
          else{
            //Go fuck yourself
            return;
          }
        }
      }
    }
    
    var mailOptions = {
      from: process.env.EMAIL_USER,
      to: "9513553820@mms.att.net,dahaux@gmail.com,aaronskeelsofficial@gmail.com,thetealviper@gmail.com",
      subject: "Aaron's Deadman Switch Warning",
      text: process.env.MESSAGEWARNING + dateToUse.toLocaleString('en-US', {timeZone: 'America/Los_Angeles'})
    };
    transporter.sendMail(mailOptions, function(error, info){
      if (error) {
        console.log(error);
      } else {
        console.log('Warning Email sent: ' + info.response);
      }
    });
  }
}, 1000);