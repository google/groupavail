/**
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Random test drivers for select functions run from the IDE on an as-needed basis (far from  complete unit/regression test suite)
 */


function testFormatAvailTime() {
  var rows = [
    [new Date('July 7, 2021 09:00:00'),new Date('July 7, 2021 10:00:00')],
    [new Date('July 7, 2021 11:00:00'),new Date('July 7, 2021 12:00:00')],
    [new Date('July 7, 2021 13:00:00'),new Date('July 7, 2021 15:00:00')],
    [new Date('July 8, 2021 09:00:00'),new Date('July 8, 2021 10:00:00')],
    [new Date('July 8, 2021 15:00:00'),new Date('July 8, 2021 16:00:00')],
    [new Date('July 9, 2021 09:00:00'),new Date('July 9, 2021 10:00:00')]
  ]
  var result = formatAvailTime(rows,'America/New_York');
  console.log(result);
}

function testFilterSchedulees() {
var list = "foo@google.com, bar@google.com, buzz@yahoo.com, nope";
  out = filterSchedulees(list,"user@google,com");

  console.log(out);
}


function randoTests() {
  var dt = new Date(1625788800000);// + 240*60*1000);
  console.log(dt + " tz " + dt.getTimezoneOffset());

  dt2 = changeTimezone(dt,Session.getScriptTimeZone());

  console.log(dt2);
}


function changeTimezoneTst(date, ianatz) {
  // suppose the date is 12:00 UTC
  var invdate = new Date(date.toLocaleString('en-US', {
    timeZone: ianatz
  }));

  // then invdate will be 07:00 in Toronto
  // and the diff is 5 hours
  var diff =  invdate.getTimezoneOffset();

  // so 12:00 in Toronto is 17:00 UTC
  return new Date(date.getTime() + diff * 60 * 1000); // needs to substract
}


function testGroupAvail() {
  var startDate= new Date();
  var endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 10);
  var dayStartTime = new Date()
  dayStartTime.setHours(9);
  dayStartTime.setMinutes(0);
  
  var dayEndTime = new Date();
  dayEndTime.setHours(17);
  dayEndTime.setMinutes(0);
//  invitees: "kharkovski@google.com, iankelly@google.com,rickkoter@google.com",
//  invitees: "rickkoter@google.com",

  var rqst = {
  invitees: 'rickkoter@google.com',
  startDate: startDate,
  endDate: endDate,
  dayStartTime: dayStartTime,
  dayEndTime: dayEndTime,
  minDuration: 30,
  includeWeekends: 'false',
  defaultTimeZone: "America/New_York"
  }
  
  var result = genAvailTime(rqst);
  console.log(result);
}

function testRound() {
  var rows = [
  /*  [new Date('July 7, 2021 09:10:00'),new Date('July 7, 2021 10:00:00')],
    [new Date('July 7, 2021 11:35:00'),new Date('July 7, 2021 12:00:00')],*/
    [new Date('July 7, 2021 10:00:00'),new Date('July 7, 2021 10:15:00')],
/*    [new Date('July 8, 2021 09:25:00'),new Date('July 8, 2021 10:55:00')],
    [new Date('July 8, 2021 15:55:00'),new Date('July 8, 2021 16:16:00')],
    [new Date('July 9, 2021 09:44:00'),new Date('July 9, 2021 10:32:00')]*/
  ] ;

  for(row of rows) {
    console.log("Start " + row[0] + "   :   " + roundTime(row[0],true,15) + " 15");
    console.log("Start " + row[0] + "   :   " + roundTime(row[0],true,30)+ " 30");
    console.log("End   " + row[1] + "   :   " + roundTime(row[1],false,15)+ " 15");
    console.log("End   " + row[1] + "   :   " + roundTime(row[1],false,30)+ " 30");
  }



}


function testModRoundingIdea() {
  console.log( 45 % 30);
  console.log( 15 % 30);
  console.log( 15 % 15);
  console.log( 5 % 30);

  var m = 55;
  console.log(Math.floor(m / 15) * 15);
  console.log(Math.ceil(m / 15) * 15); 
  console.log(Math.floor(m / 30) * 30);
  console.log(Math.ceil(m / 30) * 30); 


}


function testProperties() {
// Sets several script properties, then retrieves them and logs them.
var scriptProperties = PropertiesService.getScriptProperties().getProperties();
Logger.log(scriptProperties);

}

function testMakeDateFromDateField() {
  var ny = tzDiff("America/New_York");
  var utc = tzDiff("UTC");

  Logger.log("NY " + ny);
  Logger.log("UTC " + utc);
  Logger.log(" " + (ny - utc));

  Logger.log(new Date(1632873600000));

  var dt = new Date(1632873600000);
  var d = {
    msSinceEpoch : dt.getTime()
  }
  try  {
  var d2 = makeDateFromDateField(d,"America/Los_Angeles");
  } catch (exc) {
    Logger.log(exc);
  }
  Logger.log(dt + '\n' + d2);
}

function testMakeDateFromDateField2() {
  var ny = tzDiff("America/New_York");
  var utc = tzDiff("UTC");

  Logger.log("NY " + ny);
  Logger.log("UTC " + utc);
  Logger.log(" " + (ny - utc));

  Logger.log(new Date(1632873600000));

  var dt = new Date(1677715200000);
  var d = {
    msSinceEpoch : dt.getTime()
  }

  var dv2str = '{"dateTimeMS":"1677801600000","hasDate":true,"hasTime":false,"type":2}';

//  var dv2 = {"dateTimeMS":"1677715200000","hasDate":true,"hasTime":false,"type":2};
  var dv2 = JSON.parse(dv2str);


  var d2 = makeDateFromDateField(dv2,"America/Los_Angeles");
  Logger.log(dt + '\n' + dv2 + '\n' + d2);
}


function tzDiffTest() {
  Logger.log(" " + tzDiff("America/New_York"));
  Logger.log(" " + tzDiff("America/Los_Angeles"));
  Logger.log(" " + tzDiff("Europe/London"));
  Logger.log(" " + tzDiff("Europe/Madrid"));
  Logger.log(" " + tzDiff("UTC"));
}

function testMakeDateFromTimeField() {
  var t = {
    hours:9,
    minutes:0
  }
  var d2 = makeDateFromTimeField(t,"America/Los_Angeles");
  Logger.log(t + '\n' + d2);
}

function testIter() {

  var tz = tzmap;
  var keys = Object.entries(tzmap);
   for (const [key, value] of keys) { 
     console.log(key); 
   }
}


function throwAway() {
 
 var arr = ["e","f","g"];
 var arr2 = ["x","y","z"];
 var schedulees = [].concat("a,b,c")
            .concat(arr)
            .concat(arr2);
Logger.log(schedulees);

} 