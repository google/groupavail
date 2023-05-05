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
 * This Google Workspace Add-on provides a way to capture shared
 * calendar availability into email body using the GroupAvail library.
 *
 * Started project using:
 * https://developers.google.com/workspace/add-ons/cats-quickstart
 *
 */


function getVersion() { return version;}

//Default duration of availability search window
const TWO_WEEKS_MS =1209600000; // 14*24*60*60*1000;
const ONE_DAY_MS = 86400000;

/**
 * Callback for rendering the homepage card.
 * @return {CardService.Card} The card to show to the user.
 */
function onHomepage(e) {
 Logger.log("GroupAvail Homepage" + getVersion());
 return createInfoCard("Hello", true);
}

/**
 * Creates a card with information about GroupAvail to show in the side panel.
 * @param {String} text The text to overlay on the image.
 * @param {Boolean} isHomepage True if the card created here is a homepage;
 *      false otherwise. Defaults to false.
 * @return {CardService.Card} The assembled card.
 */
function createInfoCard(text, isHomepage) {
  // Explicitly set the value of isHomepage as false if null or undefined.
  if (!isHomepage) {
    isHomepage = false;
  }

  // Create a footer to be shown at the bottom.
  var footer = CardService.newFixedFooter()
      .setPrimaryButton(CardService.newTextButton()
          .setText('About')
          .setOpenLink(CardService.newOpenLink()
              .setUrl(ABOUT_URL)));


  var cardText = "The GroupAvail Gmail add-on provides an easy way to search and capture shared calendar availability for a set of Schedulees when scheduling time with customers, partners and vendors.\n\nGroupAvail places an editable formatted list of dates/times into the body of an email based on email addresses for invitees. To use GroupAvail when composing an email, enter the schedulees' email on the To, CC and/or BCC lines, then click the blue GroupAvail tool button at the bottom of the email composer window. A dialog box will appear and capture date range and other options before inserting availability with a button on the form. To learn more, click the About button\n\n(Version: " + getVersion() + ")";

  var instructions = CardService.newTextParagraph().setText(cardText);

  var icon = CardService.newImage().setImageUrl(LOGO_URL);

  var section = CardService.newCardSection().addWidget(icon).addWidget(instructions);

  var card = CardService.newCardBuilder()
      .addSection(section)
      .setFixedFooter(footer);

  if (!isHomepage) {
    // Create the header shown when the card is minimized,
    // but only when this card is a contextual card. Peek headers
    // are never used by non-contextual cards like homepages.
    var peekHeader = CardService.newCardHeader()
      .setTitle('Group Availability Finder')
      .setImageUrl(ICON_URL)
      .setSubtitle(text);
    card.setPeekCardHeader(peekHeader)
  }

  return card.build();
}

/**
 * Callback for rendering the card for the compose email action dialog.
 * @param {Object} e The event object.
 * @return {CardService.Card} The card to show to the user.
 */
function onGmailCompose(e) {
  var user = Session.getActiveUser().toString();
  var scriptTimeZone = Session.getScriptTimeZone();
  var userTimeZone = CalendarApp.getTimeZone();

  Logger.log("GmailCompose event: " + getVersion() + "  " + scriptTimeZone + " " + e.userTimezone.id );
//  Logger.log( JSON.stringify(e.commonEventObject));



try {
  var schedulees = [].concat(e.draftMetadata.toRecipients)
                     .concat(e.draftMetadata.bccRecipients)
                     .concat(e.draftMetadata.ccRecipients);

  var header = CardService.newCardHeader()
      .setTitle('Group Shared Availability Finder');

  // Add a space to improve readability
  var invitees = schedulees.toString().replace(/,/g, ', ');

  // Remove non domain users from the default list
  // Also adds user if not included in the list from gmail
  invitees = filterSchedulees(invitees,user);

  var inviteeList = CardService.newTextInput()
      .setFieldName('invitees')
      .setTitle('Invitees (add/edit Email IDs as needed)')
      .setMultiline(true)
      .setHint('Enter comma separated Email IDs for Schedulees to search')
      .setValue(invitees);

  var minDuration = CardService
  .newSelectionInput()
  .setFieldName("minDuration")
  .setType(CardService.SelectionInputType.DROPDOWN)
  .setTitle("Minimum Duration");

  minDuration
  .addItem('15 m','15',false)
  .addItem('30 m','30',true)
  .addItem('1 Hr','60',false)
  .addItem('1.5 Hr','90',false)
  .addItem('2.0 Hr','120',false)
  .addItem('2.5 Hr','150',false)
  .addItem('3 Hr','180',false)
  .addItem('3.5 Hr','210',false)
  .addItem('4.0 Hr','240',false)
  .addItem('8.0 Hr','480',false);

  var now = new Date().getTime();
  var startDate = CardService.newDatePicker().setFieldName("startDate").setTitle('Start Date');
  var endDate =  CardService.newDatePicker().setFieldName("endDate").setTitle('End Date');

  startDate.setValueInMsSinceEpoch(now);
  endDate.setValueInMsSinceEpoch((now + TWO_WEEKS_MS).toString());

  Logger.log(now + " " + startDate);

  var dayStartTime = CardService.
      newTimePicker()
      .setFieldName("dayStartTime")
      .setTitle('Daily Start Time (in selected timezone)');

  var dayEndTime = CardService
  .newTimePicker()
  .setFieldName("dayEndTime")
  .setTitle('Daily End Time (in selected timezone)');

  dayStartTime.setHours(9).setMinutes(0);
  dayEndTime.setHours(17).setMinutes(0);

  var includeWeekends = CardService
  .newSelectionInput()
  .setFieldName('includeWeekends')
  .setType(CardService.SelectionInputType.RADIO_BUTTON)
  .setTitle("Include Weekends?");

  includeWeekends.addItem('No','No',true);
  includeWeekends.addItem('Yes','Yes',false);

  var timeZone = CardService
  .newSelectionInput()
  .setFieldName("timeZone")
  .setType(CardService.SelectionInputType.DROPDOWN)
  .setTitle("Schedule Time Zone (default from your Calendar settings)");

  // Add timezones starting with current user TZ as default, and other key TZs in supported
  // Geos based on timezone map data
  timeZone.addItem(userTimeZone,userTimeZone,true);

   var tzs = Object.entries(tzDispList);
   for (const [key, value] of tzs) {
     if(key != userTimeZone) { timeZone.addItem(key,key,false); }
   }

  var action = CardService.newAction()
      .setFunctionName('onGmailInsertAvail');

  var button = CardService.newTextButton()
      .setText('Insert availability')
      .setOnClickAction(action)
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED);

  var buttonSet = CardService.newButtonSet()
      .addButton(button);

  var trackerIcon = CardService.newIconImage()
      .setIconUrl(gaTraceUrl("RqstAvail"));

  var tracker = CardService.newDecoratedText().setText(getVersion()).setEndIcon(trackerIcon);

  // Assemble the widgets and return the card.
  var section = CardService.newCardSection()
      .addWidget(buttonSet)
      .addWidget(inviteeList)
      .addWidget(timeZone)
      .addWidget(minDuration)
      .addWidget(startDate)
      .addWidget(endDate)
      .addWidget(dayStartTime)
      .addWidget(dayEndTime)
      .addWidget(includeWeekends)
      .addWidget(buttonSet)
      .addWidget(tracker);

  var card = CardService.newCardBuilder()
      .setHeader(header)
      .addSection(section);
} catch (exc) {
     throw formatError(exc);
}
  return card.build();
}

/**
 * Callback for inserting availability into the Gmail draft.
 * @param {Object} e The event object.
 * @return {CardService.UpdateDraftActionResponse} The draft update response.
 */
function onGmailInsertAvail(e) {
  var scriptTimeZone;
  var userTimeZone;
  var groupAvailRqst;
  var response;

  try {
    scriptTimeZone = Session.getScriptTimeZone();
    userTimeZone = e.formInput.timeZone;
    groupAvailRqst;
    Logger.log(JSON.stringify(e));
    Logger.log("onGmailInsertAvail event: " + getVersion() + "  "  + scriptTimeZone +" "+ userTimeZone);
    Logger.log("startDate:" +  e.formInput.startDate + " "+ typeof(e.formInput.startDate) + " " + userTimeZone);
    Logger.log("endDate:" +  e.formInput.endDate + " "+ typeof(e.formInput.endDate)  + userTimeZone);
    Logger.log("dayStartTime:" + e.formInput.dayStartTime + " " +  userTimeZone);
    Logger.log("dayEndTime:" + e.formInput.dayEndTime +"  " + userTimeZone);

    //Get and map user form input to GroupAvailRequest object
    groupAvailRqst = {
      invitees: filterSchedulees(e.formInput.invitees,null),
      startDate: makeDateFromDateField(e.formInput.startDate,userTimeZone),
      endDate: makeDateFromDateField(e.formInput.endDate,userTimeZone),
      dayStartTime: makeDateFromTimeField(e.formInput.dayStartTime, userTimeZone),
      dayEndTime: makeDateFromTimeField(e.formInput.dayEndTime,userTimeZone),
      minDuration: e.formInput.minDuration,
      includeWeekends: (e.formInput.includeWeekends.toLowerCase() == 'yes' ? true : false),
      defaultTimeZone: e.formInput.timeZone
    }
  } catch (exc) {
    throw formatError(exc);
  }

  if( groupAvailRqst.endDate < groupAvailRqst.startDate) {
       throw new Error( "\nEnd date must be later than start date.\nStart Date= "+groupAvailRqst.startDate+"\nEnd Date = "+groupAvailRqst.endDate);
  }
  try {
      // Make the request to the library function
      var result = genAvailTime(groupAvailRqst);

      tableContent = formatAvailTime(result,e.formInput.timeZone);

      response = CardService.newUpdateDraftActionResponseBuilder()
          .setUpdateDraftBodyAction(CardService.newUpdateDraftBodyAction()
              .addUpdateContent(".",CardService.ContentType.TEXT)
              .addUpdateContent(tableContent,CardService.ContentType.MUTABLE_HTML)
              .setUpdateType(CardService.UpdateDraftBodyType.IN_PLACE_INSERT))
          .build();

  } catch (exc) {
    throw formatError(exc);
  }
  return response;
}


function formatError(exc){
  return "\n GroupAvail Internal Error:\n\n<i>" + exc.stack + ERROR_MESSAGE;
}

/**
 * Remove non domain email addresses (we likely cannot access their calendars)
 * @param {string} list of email addresses for invitees
 */
function filterSchedulees(list,user) {
  if(list){
    var al = list.split(',');

    // Filter out non domain users
     var fl = al.filter((item) => { return DOMAINREGEX.test(item) });

     if((user != null) && !fl.includes(user)) {
       fl.push(user);
     }
     return fl.toString();
  } else {
    return user.toString();
  }
}

/**
 * Formats HTML table with available time slots
 * @param {object} rows - two dimensional array with columns for
 * start date/time and end date/time
 * @param {string} timeZone - the timezone to use for output
 */
function formatAvailTime(rows,timeZone) {
  var content;

  if(rows.length == 0 ){
    content = "<i>No time slots are available for the specified invitees/parameters</i>";
  } else {
    // Lookup up abbreviation of timezone for output if available
    var tz = tzDispList[timeZone];
    if(tz === undefined) { tz = "(" + timeZone + ")"; }
    var content = "<br><u><b>Available Times</b> " + tz + "</u><br>";

    for(let item of rows) { content += formatTableRow(item,timeZone)};
    content += "</ul>";

    content += '<p style="font-size:8px" style="color:gray">GroupAvail</p>';
  }
  return content
}

// used across output rows to track when to output a new day (for multiple following time slots)
var lastWrittenDay;

/**
 * Writes a formatted line to the gmail body given the availability item and line index
 */
function formatTableRow(item, timeZone) {
  var start = item[0];
  var end = item[1];
  var dayString = "";

  if(lastWrittenDay === undefined) {dayString = "";}

  // Add month/date information - if it has not been written before.
  if ((lastWrittenDay === undefined) || lastWrittenDay.getDay() != start.getDay()) {

    if(lastWrittenDay === undefined) {
        dayString =  "<b>";
     } else {
       dayString = "</ul><b>";
     }
      dayString += "&nbsp;&nbsp;" + getDayName(start.getDay()) + "  (" +
            getMonthName(start.getMonth()) + " " + start.getDate() + ") : </b><ul>";
  }

  lastWrittenDay = new Date(start);
  return(  dayString   + "<li>"+ formatTime(start,timeZone) + " to " + formatTime(end,timeZone) + "</li>");
}

/**
 * Format the time for display in the output
 * @param {object} d  the date object to format
 * @param {string} timeZone - the timezone to use for output formatting
 */
function formatTime(d,timeZone) {
  var formattedDate;

  if(timeZone.startsWith("America") || timeZone.startsWith('Canada')) {
    formattedDate = Utilities.formatDate(d, timeZone, "hh:mm a");
  } else {
    formattedDate = Utilities.formatDate(d, timeZone, "HH:mm");
  }
  return formattedDate.toLowerCase();
}

/**
 * Trace events for usage in Google Analytics by placing the following URL into the form as
 * a small image
 * @param {string} action name to be tracked in Google Analytics
 **/
const gaID = GOOGLE_ANALYTICS_ID;

function gaTraceUrl(action)
{
 // Breaking down the analytics URL payload:v=1
 // Version.&tid=YOUR_TRACKING_ID
 // Your UA-XXXXX-Y
 // Tracking ID &uid=A_USER_ID
 // user_id (either a uid or anonymous cid (client id) is required)&t=event
 // Event hit type&ec=engagement
 // Event Category. Required.&ea=sign_up
 // Event Action. Required.&el=Twitter
 // Event label &el=XXX
 // Event value &ev=VALUE
 // Not used per policy
 // uid='+userID+'

  var actver = action + "-" + getVersion();
  var url = `https://ssl.google-analytics.com/collect?v=1&tid=${gaID}&t=event&ec=GroupAvail&cid=555&ea=${actver}`;

  return url;
 }
