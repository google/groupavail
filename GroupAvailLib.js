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

/* This script uses the Google Calendar API to search for and present 
 * shared calendar available time. It  accepts input defining the start date,
 * end date, time-of-day start and end times, minimum duration, 
 * if weekends should be included and the timezone to use for the search. 

 * The library uses Calendar API - https://developers.google.com/calendar/overview
 * Based on an example here https://developers.google.com/calendar/quickstart/apps-script
 */

const DAY_DURATION_MS = 24 * 60 * 60 * 1000;

/**
 * Main entry point to generate a list of available time slots based on the user's 
 * calendar and parameters provide on the spreadsheet
 * @param {Object} groupAvailRequest - object with parameters for GroupAvail Request
 */
function genAvailTime( groupAvailRequest) {

  Logger.log("New GroupAvail Request " + getVersion());
  groupAvailRequest = checkParams(groupAvailRequest);

  // Find all blocked time
  var blockedTime = findBlockedTime(groupAvailRequest);

  // Log output for debug purposes   
  Logger.log("Number of blocked entries: " + blockedTime.length);
  blockedTime.forEach(logRow);

  // Convert list of blocked times into the whitespace inbetween as available times.
  var avail = findAvailTimes(groupAvailRequest, blockedTime);

  // Log result
  Logger.log("Number of avail slots = " + avail.length);

  /**
   * START CHANGES (2021-05-14 - @verbanicm)
   * Filter weekends from available data before adding to list, 
   * allows for better formatting
   */
  // Filter out weekends if needed
  const filteredAvail = avail.filter((row) => {
    if ((groupAvailRequest.includeWeekends == false) && ((row[0].getDay() == 0) || row[0].getDay() == 6)) {
      return false;
    } else {
      return true;
    }
  });

  return filteredAvail;
}

/**
 * Read input parameters from sheet and initialize global data
 * @param {object} rqst - Request object with user specified search parameters
 */
function checkParams(rqst) {
  // convert to time in millis
  rqst.minDuration = rqst.minDuration  * 60 * 1000;
 
  // User the Apps Script's timezone if not specified in the request
  if (rqst.defaultTimeZone == "") {
    rqst.defaultTimeZone = Session.getScriptTimeZone();
  }
  
  rqst.startDate = genDate(rqst.startDate.getTime(),
        rqst.dayStartTime.getHours(),
        rqst.dayStartTime.getMinutes());

  var now = new Date();

  // Do not include dates before now.
  if (rqst.startDate.getTime() < now.getTime()) {
    rqst.startDate = roundTime( now, false, rqst.minDuration);
  }

  rqst.endDate = genDate(rqst.endDate.getTime(),
        rqst.dayEndTime.getHours(),
        rqst.dayEndTime.getMinutes());

  Logger.log("GroupAvail Request Parameters:" +
//    " invitees=" + rqst.invitees +
    " invitees=" + "<redacted>" +
    " startDate=" + rqst.startDate +
    " endDate=" + rqst.endDate +
    " dayStartTime=" + rqst.dayStartTime +
    " dayEndTime=" + rqst.dayEndTime +
    " minDuration=" + rqst.minDuration +
    " includeWeekends=" + rqst.includeWeekends +
    " defaultTimeZone=" + rqst.defaultTimeZone);
    return rqst;
}

// Locate all calendar blocks within the provided time range.
// Events are assumed to be provided in calendar order by the Google API
function findBlockedTime(rqst) {
  var blockedTime = new Array();
  var j = 0;
  var calEvent;
  var dayEnd;
  var title;
  var start;
  var end;
  var priorBlockEnd;
  Logger.log("findBlockedTime "+ rqst.startDate +" " + rqst.endDate);
  var events = getAllEvents(rqst.invitees, rqst.startDate, rqst.endDate)
  Logger.log("Number of blocked events in calendar: " + events.length);

  // The loop below assumes that events are sorted in order of date/time
  // Also merges adjacent and overlapping blocked times

  for (var i = 0; i < events.length; i++) {
    calEvent = events[i];
    title = calEvent.getSummary();
    status = calEvent.getStatus();
    transp = calEvent.getTransparency();
    start = when(rqst, calEvent.getStart(), true);
    end = when(rqst,calEvent.getEnd(), false);

    Logger.log('calEvent: [%s, %s], %s, %s: %s [from: %s %s]', start, end, status, transp, title, calEvent.getStart(), calEvent.getEnd());

    dayEnd = genDate(end, 
      rqst.dayEndTime.getHours(),
      rqst.dayEndTime.getMinutes());

    // if event start is after the end of the day - begin the block 
    // starting at the end of the day (e.g. evening events)
    if (start > dayEnd) {
      start = dayEnd;
    }

    // Specifies a block of time (maybe merged) that is blocked for the calendar(s)
    var blockspec = [title, start, end];

    // Check if first event insertion and seed - or subsequent events to handle overlaps
    if (i == 0) {
      blockedTime.push(blockspec);
      j += 1;
    } else {
      // Eliminate overlaps - don't add a new block when the end time is inside of prior event
      priorBlockEnd = blockedTime[j - 1][2];
      if (end > priorBlockEnd) {

        // Merge when start time is inside of prior event's time
        if (start < blockedTime[j - 1][2]) {
          blockedTime[j - 1][2] = end; // don't add a new entry - update last event's end time.
        } else {
          blockedTime.push(blockspec); // Add a new block
          j += 1;
        }
      }
    }
  }
  return blockedTime;
}

// Find the open space between blocked time
// Handles split days, day start time and end time
// boundaries to create a list of availability times
function findAvailTimes(rqst, blocked) {
  var availTimes = new Array();
  var curBlock;
  var nextBlock;

  // Add block at the beginning of time range
  nextBlock = blocked[0];
  addAvail(rqst, availTimes, rqst.startDate, nextBlock[1], "A");

  // Search for chunks of free time using blocked time open spots between 
  // end of blocked time to start of next blocked time
  for (var i = 0; i < (blocked.length - 1); i++) {

    // Avail time is time in between two blocks   
    // blocked[i][2]; -> end time of blocked time
    // blocked[i+1][1] -> start time of *next* blocked time
    curBlock = blocked[i];
    nextBlock = blocked[i + 1];
    addAvail(rqst, availTimes, curBlock[2], nextBlock[1], "B" + i);
  }
  // add another block that goes til the end of the last day  
  var dayEnd = genDate(blocked[i][2].getTime(), rqst.dayEndTime.getHours(), 
                    rqst.dayEndTime.getMinutes());

  curBlock = blocked[i];
  addAvail(rqst, availTimes, curBlock[2], dayEnd, "C");

  return availTimes;
}

/**
 * Adds an available blocks of time to a list of shared availability 
 * Also handles splitting blocks over multiple days and 
 * blocks of days that have nothing scheduled and are fully free.
 * @param {object} rqst - the original request parameters
 * @param {object} availTimes the array of time blocks that are available
 * @param {object} availStart - the start time of the availability block to add
 * @param {object} availEnd- the end time of the availability block to add
 * @param {string} mark - a letter to include in output for debugging 
 */
function addAvail(rqst, availTimes, availStart, availEnd, mark) {
  var spanTime;
  var numSpanDays;
  var start;
  var end;
  var priorEnd;

  // Does the available block span a day (or days)?
  if (spansDays(availStart, availEnd)) {
   // Logger.log("A day or more span found between " + availStart + " and " + availEnd);

    // Test avail start to see if it is before end of day and add an avail slot if so
    var dayEnd = genDate(availStart.getTime(),
      rqst.dayEndTime.getHours(),
      rqst.dayEndTime.getMinutes());

    if (availStart.getTime() < dayEnd.getTime()) {
      addAvail(rqst, availTimes, availStart, dayEnd, mark + "H");
    }

    // Determinue number of days spanned and create avail slots for each day taking into 
    // account the event input end date/time.

    spanTime = availEnd.getTime() - availStart.getTime();

    // Is / are full day(s) open?
    if (spanTime > DAY_DURATION_MS) {
      numSpanDays = Math.floor((spanTime / DAY_DURATION_MS));
     // Logger.log("More than a day between " + availStart + " and " + availEnd + " days = " + numSpanDays);

      start = genDate(availStart.getTime(),
        rqst.dayStartTime.getHours(),
        rqst.dayStartTime.getMinutes());

      // Iterate over in-between-days
      for (var i = 0; i < numSpanDays; i++) {
        start = genDate(start.getTime() + DAY_DURATION_MS,
          rqst.dayStartTime.getHours(),
          rqst.dayStartTime.getMinutes());
        if(!spansDays(start,availEnd)) {
          end = availEnd;
        } else {
          end = genDate(start.getTime(),
            rqst.dayEndTime.getHours(),
            rqst.dayEndTime.getMinutes());
        }
        // TODO adjust end for last slot to availEnd time
        addAvail(rqst, availTimes, start, end, mark + "F" + i);
        priorEnd = end;
      }
    }

    // Now looking at the last avail end day
    if ((priorEnd === undefined) || (availEnd.getTime() > priorEnd.getTime())) {
      // Add an available slot at the end of the range on the end date of the range
      start = genDate(availEnd.getTime(),
        rqst.dayStartTime.getHours(),
        rqst.dayStartTime.getMinutes());

      var clmp = clampTimes(rqst,start,availEnd);

       // ignore this slot if our availability collapsed to no available time due to day start / end
      if (clmp.start >= clmp.end) return;

      addAvail(rqst, availTimes, clmp.start, clmp.end, mark + "G");
    }
  } else {

    var clmp = clampTimes(rqst,availStart,availEnd);
    availStart = clmp.start;
    availEnd = clmp.end;

    // ignore this slot if our availability collapsed to no time due to day start / end
    if (availStart >= availEnd) return;

    // ignore this slot if the availbility is less than min duration
    var duration = availEnd - availStart;
    if (duration < rqst.minDuration) return;

    availTimes.push([availStart, availEnd, mark]); // start of avail time is end of current blocked time and start of next
  }
}

/**
 * Acceptng start and end times, move to start soonest at dayStart, and end at latest at dayEnd times
 * @param {object} start time for adjustment
 * @param {object} end time for adjustment
 */
function clampTimes (rqst, start, end) {
  // Set day specific day start and end times.  
  var dayStart = genDate(start.getTime(),
      rqst.dayStartTime.getHours(),
      rqst.dayStartTime.getMinutes());

  var dayEnd = genDate(end.getTime(),
      rqst.dayEndTime.getHours(),
      rqst.dayEndTime.getMinutes());

  // Clamp avail blocks to day end boundaries
  if (start < dayStart) start = dayStart;
  if (end > dayEnd) end = dayEnd;

  return  { end: end, start: start};
}

/** 
 * Determine if the time between two date objects spans a day
 * @param {object} start time to test for day spanning
 * @param {object} end time to test for day spanning
 */
function spansDays(start, end) {
  if (start.getYear() != end.getYear()) { return true; }
  if (start.getMonth() != end.getMonth()) { return true; }
  if (start.getDay() != end.getDay()) { return true; }

  return false;
}

// Create a new date with time base date using different hours and minutes
function genDate(baseTime, h, m) {
  d = new Date(baseTime);
  d.setHours(h);
  d.setMinutes(m);
  d.setSeconds(0);
  return d;
}

// used in forEach blocks for lists to log intermediate results for debugging
function logRow(item, index) {
  // Uncomment for debugging details
 // Logger.log(item);
}

/**
 * Retrieves all events for all users given the date range
 * Uses the Calendar API
 * @param {string} ids list (comma separated) of email addresses for calendars to search
 * @param {object} starting time for search
 * @param {object} endind time for search
 */
function getAllEvents(ids, starting, ending) {
  var allEvents = Array();
  Logger.log("getAllEvents " + starting + " to " + ending );
  
  // Search arameters for the event search API call
  var calArgs = {
    timeMin: starting.toISOString(),
    timeMax: ending.toISOString(),
    showDeleted: false,
    singleEvents: true,
    maxResults: 2000,
    orderBy: 'startTime'
  };

//  Logger.log("Calendar Events Arguments %s -- %s", JSON.stringify(ids), JSON.stringify(calArgs));

  // Split and remove whitespace from invitee list
  var idlist = ids.split(",").map(function (item) { return item.trim(); });

  // Use Calendar API - https://developers.google.com/calendar/overview
  // Based on example here https://developers.google.com/calendar/quickstart/apps-script
  // Iterate over calendars of intended 

  for (calendarId of idlist) {


    // Adjust calendarIds into proper email addresses (assume "@google.com")
    calendarId = adjustAddress(calendarId);
    var response;
    try {
      response = Calendar.Events.list(calendarId, calArgs);
    } catch (err) {
      var errStr = "Attempt to retrieve calendar for <b>" + calendarId + " </b>failed with error " + err + 
      "\nOnly valid @" + WORKSPACE_DOMAIN + " email addresses are supported\n";
      Logger.log(errStr);
      throw(new Error(errStr));
    }

//    Logger.log("Retrieved Calendar for %s (%d events)", calendarId, response.items.length)
    Logger.log("Retrieved Calendar  %d events",  response.items.length)

    // Iterate over all of the events from the API response
    for (var evt of response.getItems()) {
      var sum = evt.getSummary();

      // Using Event Transparency alone failed. It is not set on many events. 
      // for events that are explicitly set as Transparent, do not include the time as blocked
      var transp = evt.getTransparency();
     
        // The following approach will also count as free time events where the invitee has 
        // not yet replied to an event (versus default free/busy approach to show busy.)
        // This is done because it is common for users to leave recurring optional events as unaccepted.
      var attlist = evt.getAttendees();

      if (attlist != null) {
        for (var att of attlist) {
          var block = false;

          // Only look at the attributes for invitee calendarID assocaited with calendar being processed
          if (att.email == calendarId) {

            var respSt = att.getResponseStatus();
            // Capture "blocked" unavailable based on combination of transparency status (free), 
            // accepted status or ignore
            if ((att.status == "tentative") || (att.status == "accepted")) {
              block = true;
            } else if ( isNotTransparent(transp) // Explicitly marked free (transparent) or not at all
                && (respSt != "notReplied")      // Response statues that mean either explicitly declined 
                && (respSt != "needsAction")     // or implicitly open by way no action to accept or decline)
                && (respSt != "declined") ) {
              block = true; 
            }

            if(block) {
              allEvents.push(evt);
            }
            
            Logger.log("Event / attrs," + block + ",summary length=" + sum.length + ", response/attendee status=[" + respSt + ", "+ att.status + "]' transparency=" + transp + ' Start/End Time =' + evt.getStart() + " to " + evt.getEnd());

            break;
          }
        }
      } else {
        // Events can appear on calendars without invitees - assume that calendar 
        // owner set to the searcher and is attending if not explicity set to transparent (free).
          Logger.log("Event -summary length=" + sum +  ", "+ " transparency=" + transp + ' Start/End Time =' + evt.getStart() + " to " + evt.getEnd());
        if(isNotTransparent(transp)) {
           allEvents.push(evt);
        }
      }
    }
  }

  // Sort all Events by start time using an event comparator function
  return allEvents.sort(evtCompare);
}

/**
 * Address inconsistencies found in returned calendar entry transparency values in testing -
 * @param {string} transp value returned from Calendar entry API 
 */
function isNotTransparent(transp) {
  return ((transp == null) || (transp != null) && (transp != "transparent"));
}

/**
 * Makes email addresses entered by user consistent (assuming the primary workspace domain)
 * @param {string} str email address of presumed user in the workspace domain
 */
function adjustAddress(str) {
  var addr;

  if(/@\w*\.\w*/.test(str)) {
    addr = str;
  } else if(/@\s/.test(str)) {
    addr = str + WORKSPACE_DOMAIN;
  } else {
    addr =str + '@'+WORKSPACE_DOMAIN;
  }
  return addr;
}

/**
 * Comparator for sorting events by start date / time (all in UTC)
 * @param {object} a  calendar event from the to-be-sorted list
 * @param {object} b  calendar event from the to-be-sorted list
 */
 function evtCompare(a, b) {
   // Strange extra conversion is to handle cases where event can be an all day event and represented differently to
   // cause getStartTime to not return (alternative would be to test the event type and get the 
   // date/time using a different method incurring the same overhead as this approach wrt object creation)
  var sa = new Date(a.getStart().getDateTime()).getTime();
  var sb = new Date(b.getStart().getDateTime()).getTime();

  if (sa < sb) {
    return -1;
  } else if (sa > sb) {
    return 1;
  } else {
    return 0; // equal
  }
}

/**
 * Function to clean up consistency for event start/end dates that 
 * either include or come without time.
 * @param {object} rqst as specified to the library from user input
 * @param {object} dt is the date to be cleaned for consistency
 * @param {boolean} isStart used to determine rounding up or down when a start or end time of block
 */
function when(rqst, dt, isStart) {
  var dd = dt.getDateTime();
  var diff;
/*   Logger.log("When dt:" + dt );*/

  if (isStart) { diff = rqst.dayStartTime } else { diff = rqst.dayEndTime };

  if (typeof dd === 'undefined') {
    dt = new Date(dt.getDate() );
    dt.setHours( diff.getHours() );
    dt.setMinutes( diff.getMinutes() );
  } else {
    dt = new Date(dd);
  }

  rt = roundTime(dt,isStart,rqst.minDuration);
/*  Logger.log("When dt:" + dt + " minDuration:" + rqst.minDuration + " diff:" + diff + " rt:"+ rt);*/

  return rt;
}