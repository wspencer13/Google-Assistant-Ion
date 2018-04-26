
'use strict';

// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require('firebase-admin');
const functions = require('firebase-functions');
const simpleoauth2 = require('simple-oauth2');
const request = require('request');
const fs = require('fs');
let DialogflowApp = require('actions-on-google').DialogflowApp;

var headers;
var body;
admin.initializeApp(functions.config().firebase);

const WELCOME_INTENT = 'input.welcome';  // the action name from the API.AI intent
const TEST_INTENT = 'input.test';
const GOING_INTENT = 'input.going';
const SCHEDULE_INTENT = 'input.schedule';
const PICTURE_INTENT = 'input.picture';
const FIND_INTENT = 'input.find';
const FIND2_INTENT = 'input.find2';
const FIND3_INTENT = 'input.find3';
const FIND4_INTENT = 'input.find4';
const FIND5_INTENT = 'input.find5';

var weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

//variables that will be instantiated when user inputs their data
var type;
var weekDate;
var block;

//makes a string from a list of possible options to display
function makeString(arr)
{
  var str = "";

  if(arr.length > 2)
  {
    for(var x = 0; x < arr.length - 1; x++)
    {
      str += arr[x] + ", ";
    }
    str += 'or ' + arr[arr.length - 1];
  }

  else if(arr.length == 2)
    str = arr[0] + ' or ' + arr[1];
  else
    str = arr[0];

  return str;
}
 //outputs rich response with options based on given array with question output
function outputFromArray(arr, output, app)
{
  var str = makeString(arr); //makes displayable string from array

  app.ask(app.buildRichResponse()
    .addSimpleResponse({speech: output + ' ' + str,
      displayText: output})
    .addSuggestions(arr) //suggestions at bottom of categories
  );
}

// Create functions to handle requests here
function welcomeIntent (app) {
  const access_token = app.getUser().accessToken;
  var name;

  var my_ion_request = 'https://ion.tjhsst.edu/api/profile?format=json&access_token='+access_token;
  request.get( {url:my_ion_request}, function (e, r, body) {
    const lastSeen = app.getLastSeen();
    console.log(lastSeen);
    var res_object = JSON.parse(body);
    var nick =  res_object.nickname;
    if(nick.length > 0)
      name = nick;
    else
      name = res_object.first_name;

    if(app.getLastSeen()) //user has used app before
      app.ask('Hey ' + name + '! What can I do for you today? I can help you sign up for eighth periods and view other TJ Ion information. Just ask me a question.');
    else
      app.ask('Nice to meet you ' + name + '! I can help you sign up for eighth periods and view other TJ Ion information. Just ask me a question.');
  });


}

function findIntent(app){

  var obj = new Object();
  //var jsonString= JSON.stringify(obj);

  // Get content from file
  var contents = fs.readFileSync("classification.json");
  // Define to JSON type
  var json = JSON.parse(contents);

  var contents2 = fs.readFileSync("categories.json");
  var json2 = JSON.parse(contents2);

  var categories = []; //list of all categories (to avoid hardcoding)

  for (var key in json) { //loops through all eighth period ids
    if (json.hasOwnProperty(key)) { //makes sure it is an actual key
      var prop = json[key];
      var category;

      for (var key2 in json2) {
        if (json2.hasOwnProperty(key2)) {
          var jsonArray = json2[key2]; //array of lower categories
          for(var i = 0; i < jsonArray.length; i++) //loops through categories in array
            if(jsonArray[i] == prop) //if found the correct property
            {
              category = key2; //saves the parent category (key2)
            }
        }
      }

      if(!obj.hasOwnProperty(category)) //checks if created object does not have this classification
      {
        var array = [key];//creates new array
        obj[category] = array;
        categories.push(category);
      }
      else
      {
        obj[category].push(key); //adds number to prop array
      }
    }
  }

  var output = 'What Category of 8th period would you like?'
  outputFromArray(categories, output, app)
}

function find2Intent(app)
{
  var type = body.result.parameters['type'];
  console.log(type);

  var contents = fs.readFileSync("categories.json");
  var json = JSON.parse(contents);

  var jsonArray;

  for (var key in json) { //loops through all eighth period ids
    if (json.hasOwnProperty(key)) { //makes sure it is an actual key
      if (type == key){
        jsonArray = json[key]; //returns array for found type
      }
    }
  }

  if(jsonArray.length > 1) //if more than one subcategory;
  {
    var output = 'What Sub-Category of 8th period would you like?'
    outputFromArray(jsonArray, output, app)
  }
  else { //only one subcategory
    app.ask("There are no subcategories, so the next question will be asked. Is this okay?");
  }
}

function find3Intent(app)
{
  type = body.result.parameters['subcategory'];
  var array = ["Wednesday", "Friday"];
  var question = "Great! What day do you want this club to meet?";
  outputFromArray(array, question, app);
}

function find4Intent(app)
{
  weekDate = body.result.parameters['inputDate'];
  var array = ["A Block", "B Block"];
  var question = "Great! What block do you want this club to meet?";
  outputFromArray(array, question, app);
}

function find5Intent(app)
{
  block = body.result.parameters['block'];
  //console.log("Block: " + block + " Day: " + weekDate + " Type: " + type);
  var dateNum = weekdays.indexOf(weekDate.toLowerCase());

  var contents = fs.readFileSync("classification.json");
  var json = JSON.parse(contents);
  //var lastKey = Object.keys(json)[Object.keys(json).length-1];
  var indexCount = 0; //count of indeces that fit main category
  for (var key in json) { //loops through all eighth period ids
    if (json.hasOwnProperty(key)) { //makes sure it is an actual key
      if(json[key] == type) //if right subcategory
      {
        indexCount++;
      }
    }
  }
  console.log("indexCount: " + indexCount);

  const access_token = app.getUser().accessToken;

  var numberList = []; //list of ids that fit criteria
  var nameList = []; //names for corresponding ids
  var count = 0; //increases when reaches a category that fits
  var keyList = []; //list of keys that fit category

  for (var key in json) { //loops through all eighth period ids
    if (json.hasOwnProperty(key)) { //makes sure it is an actual key
      if(json[key] == type) //if right subcategory
      {
        keyList.push(key);
        var my_ion_request = 'https://ion.tjhsst.edu/api/activities/' + key + '?format=json&access_token='+access_token;
        request.get( {url:my_ion_request}, function (e, r, body) {
          var reqKey = keyList[count];
          count++;

          var res_object = JSON.parse(body);
          var schedule = res_object.scheduled_on;
          for (var oneBlock in schedule) //grabs a block from the JSON
          {
            if (schedule.hasOwnProperty(oneBlock)) {
              var singleDate = new Date(schedule[oneBlock].date);
              if(schedule[oneBlock].block_letter.toLowerCase() == block.toLowerCase() && singleDate.getDay().toString() == dateNum.toString()) //block and weekday match
              {
                numberList.push(reqKey); //adds number to list if passes criteria
                nameList.push(res_object.name);
                break; //break out of inner loop
              }
            }
          }
          if(count == indexCount) //if this is the last request needed to be made
          {
            var output = makeString(nameList);
            app.tell("Potential Eighth Periods are: " + output);
          }
        });
        if(count == indexCount) //if this is the last request needed to be made
          break;
      }
    }
  }

}

function pictureIntent(app)
{
  const access_token = app.getUser().accessToken;

  var my_ion_request = 'https://ion.tjhsst.edu/api/profile?format=json&access_token='+access_token;
  request.get( {url:my_ion_request}, function (e, r, body) {
    var res_object = JSON.parse(body);
    var picUrl = res_object.picture;
    console.log(picUrl);

    app.ask(app.buildRichResponse()// Create a basic card and add it to the rich response
    .addSimpleResponse('Here you go.')
      .addBasicCard(app.buildBasicCard("This is you!")
        .setImage(picUrl, "Picture of the user")
      )
    );
  });
}

function goingIntent(app){
  const access_token = app.getUser().accessToken;

  var my_ion_request = 'https://ion.tjhsst.edu/api/signups/user?format=json&access_token='+access_token;

  request.get( {url:my_ion_request}, function (e, r, body) {
    var date = new Date();
    var year = Number(date.getFullYear().toString());
    var month = Number((date.getMonth() + 1).toString()); //returns 0-11
    var day = Number(date.getDate().toString());

    var res_object = JSON.parse(body);
    var index = 0;
    var block;
    var blockDate;
    while(true) //loop to determine upcoming block date
    {
      block = res_object[index];
      blockDate = block.block.date;
      var blockYear = Number(blockDate.slice(0, 4));
      var blockMonth =  Number(blockDate.slice(5, 7));
      var blockDay = Number(blockDate.slice(8, 10));
      if(blockYear > year)
        break; //new year
      else if(blockYear == year && blockMonth > month)
        break; //new month
      else if(blockYear == year && blockMonth == month && blockDay >= day)
        break; //same or higher day
      else
        index +=1; //continues searching
    }
    var output = "You are currently signed up for " + block.activity.title;

    index += 1;
    block = res_object[index];
    while(block.block.date == blockDate) // loops through all other blocks on same date
    {
      output += " and " + block.activity.title;
      index += 1;
      block = res_object[index];
    }
    output += ".";

    app.tell(output);
  });

}

function scheduleIntent(app)
{
  var my_ion_request = 'https://ion.tjhsst.edu/api/schedule?format=json'; //no access token for schedule

  request.get( {url:my_ion_request}, function (e, r, body) {
    var res_object = JSON.parse(body);
    var day = res_object.results[0].day_type;
    var output = "<speak>" + "Today is a " + day.name + "<break strength='medium'/>\n";
    if(day.blocks.length > 0)
    {
      output += "Today's schedule is... <break strength='weak'/>\n"
      for(var x = 0; x < day.blocks.length; x++)
      {
        var start = day.blocks[x].start;
        if(Number(start.substr(0, start.indexOf(':'))) > 12) //changes from 24 hour time to 12 hour time
          start = (Number(start.substr(0, start.indexOf(':'))) - 12) + start.substr(start.indexOf(':'));
        var end = day.blocks[x].end;
        if(Number(end.substr(0, end.indexOf(':'))) > 12) //changes from 24 hour time to 12 hour time
          end = (Number(end.substr(0, end.indexOf(':'))) - 12) + end.substr(end.indexOf(':'));
        output += day.blocks[x].name + ", " + start + "-" + end + " <break strength='weak'/>\n";
      }
    }
    output += "</speak>";
    app.tell(output);
  });
}

function testIntent(app)
{
  const access_token = app.getUser().accessToken;

  var my_ion_request = 'https://ion.tjhsst.edu/api/profile?format=json&access_token='+access_token;
  request.get( {url:my_ion_request}, function (e, r, body) {
    console.log(e);
    console.log(body);
    app.tell(body);
  });
}


const actionMap = new Map();
actionMap.set(WELCOME_INTENT, welcomeIntent);
actionMap.set(TEST_INTENT, testIntent);
actionMap.set(GOING_INTENT, goingIntent);
actionMap.set(SCHEDULE_INTENT, scheduleIntent);
actionMap.set(PICTURE_INTENT, pictureIntent);
actionMap.set(FIND_INTENT, findIntent);
actionMap.set(FIND2_INTENT, find2Intent);
actionMap.set(FIND3_INTENT, find3Intent);
actionMap.set(FIND4_INTENT, find4Intent);
actionMap.set(FIND5_INTENT, find5Intent);


const factsAboutGoogle = functions.https.onRequest((request, response) => {
  const app = new DialogflowApp({ request, response });
  console.log(`Request headers: ${JSON.stringify(request.headers)}`);
  headers = request.headers;
  console.log(`Request body: ${JSON.stringify(request.body)}`);
  body = request.body;


  app.handleRequest(actionMap);
});

module.exports = {
  factsAboutGoogle
};
