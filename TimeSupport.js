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
 *  Functions and tables related to date and time/timezone display, mapping and formatting
 */

/**
 * Convert date from UI (object with ms since epoch) to javascript date
 * For unknown reasons, the DatePicker always returns a date in UTC even 
 * when user is choosing the date in their timezone. This hack moves the date 
 * to the proper timezone based on user specified timezone
 * @param {object} d - date object from Card UI
 * @param {object} ianatz - IANA Time Zone associated with the user
 */
function makeDateFromDateField(d_in, ianatz) {
  // Changed on 3/2/2023 - (undocumented change to input from card UI events from msSinceEpoch integer to a JSON string with fields.)
  //  var d = JSON.parse(d_in);

// Unchanged on 5/5/2023 whene prior behavior restored.
  var d = d_in.msSinceEpoch;

  var userTZDiff = tzDiff(ianatz);
  var utcTZDiff = tzDiff("UTC"); // UI Date Picker always returns date relative to UTC.

  var diff = userTZDiff - utcTZDiff; // Move the UTC date based on the user specified timezone.

// Change undone on 5/5/2023
// var ret =  new Date(parseInt(d.dateTimeMS) + diff);
/// prior version -saved   on 3/2.
  var ret =  new Date(d + diff);
  
  Logger.log("makeDateFromDateField " + d + " output tz="+ ianatz +' diff ' + diff + "=user " + userTZDiff +"- utc "+ utcTZDiff + ' d= ' + d + ' d.dateTimeMS='+ d.dateTimeMS + " dict " + d["dateTimeMS"] + " " + typeof(d) +" "+ typeof(d.dateTimeMS) + " =?" + parseInt(d.dateTimeMS)+ '  ret=' + ret + " " + new Date().getMilliseconds());
  return ret;
}

/**
 * Convert date from UI (object with hours and minutes) to javascript date
 * @param {object} t - time object from Card UI with hours and minutes
 * @param {object} ianatz - IANA Timezone to be used for output
 */
function makeDateFromTimeField(t_in, ianatz) {
  // Changed on 3/2/2023 - (undocumented change to input from card UI events)

//  var t = JSON.parse(t_in); // Interim workaround for issue in type released in march
// Unchanged on 5/5/2023 whene prior behavior restored.
  var t = t_in; 

  // Difference for the timezone of the input
  var diff = tzDiff(ianatz);

  var dt = new Date();

  // Get a new date object for the given time (in the server's TZ)
//  dt.setUTCHours(0);
//  dt.setUTCMinutes(0);
//  dt.setUTCSeconds(0);
//  dt.setUTCMilliseconds(parseInt(t.dateTimeMS));

  dt.setUTCHours(t.hours);
  dt.setUTCMinutes(t.minutes);
  dt.setUTCSeconds(0);
  dt.setUTCMilliseconds(0);
  var msSinceEpoch = dt.getTime();

  // Adjust by adding in the timezone difference
  var ret =  new Date( msSinceEpoch + diff);

  Logger.log("makeDateFromTimeField t"+ t + " h:m " + t.hours + ":" + t.minutes + " output tz="+ ianatz + ' diff ' + diff + ' msSinceEpoch ' + msSinceEpoch + ' ret=' + ret);
  return ret;
}

/**
 * Calculate the timezone difference between the current runtime to the timezone provided.
 * Used to adjust input from Add On Card UI API)
 * @param {string} ianatz - the IANA standard timezone name (e.g. America/New_York)
 */
function tzDiff(ianatz) {

  var ret =  0;
  if (ianatz != null ) {

    const now = new Date();
    now.setSeconds(0, 0);

    // Format current time in `ianaTimeZone` as `M/DD/YYYY, HH:MM:SS`:
    const tzDateString = now.toLocaleString('en-US', {
      timeZone: ianatz,
      hourCycle: 'h23',
    });

    // Parse formatted date string:
    const match = /(\d+)\/(\d+)\/(\d+), (\d+):(\d+)/.exec(tzDateString);
    const [_, month, day, year, hour, min] = match.map(Number);

    // Change date string's time zone to UTC and get timestamp:
    const tzTime = Date.UTC(year, month - 1, day, hour, min);

    var serverTime = new Date().getTime();
    
    ret = Math.round((serverTime - tzTime) / 1000) * 1000;
  }
  return ret;
}

/**
 * Month name for index
 * @param (integer) the index of the month name
 */
function getMonthName(ix) {
  // @todo - these arrays need to be I18N'ed 
  var monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  return monthNames[ix];
}

/**
 * Day of the week name for index
 * @param (integer) the index of the day name
 */
function getDayName(ix){
  var dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return dayNames[ix];
}


/**
 * Round time indt up or down (depending on start or end) to nearest boundary based on rounding input
 * @param {object} dt the date object to round
 * @param {boolean} isStart - is this date a start (or end) date
 * @param (integer) minDuration - the minumum duration for availability to include, used for rounding time
 */
function roundTime(dt,isStart,minDuration){

  var minutes = dt.getMinutes();
  var hours = dt.getHours();
  var mdmin = minDuration / (60 * 1000);

  var roundClip = mdmin > 15 ? 30 : mdmin;

  if(isStart) {
    minutes = Math.floor(minutes / roundClip) * roundClip;
  } else {
    minutes = Math.ceil(minutes / roundClip) * roundClip; 
    if(minutes >= 60) {
      hours +=1;
      minutes = 0;
    }
  }
  dt.setHours(hours);
  dt.setMinutes(minutes);

  return dt;
}

// Formatting 
// Provide a subset of conventional timezones for user selection (currently Americas/Europe 
// since wider testing not completed for business time ranges that span days
var tzDispList = {
  "America/New_York": "(ET)",
  "America/Chicago": "(CT)",
  "America/Denver": "(MT)",
  "America/Phoenix": "(MST)",
  "America/Los_Angeles": "(PT)",
  "America/Anchorage": "(AK)",
  "Pacific/Honolulu": "(HAST)",
  'Canada/Atlantic':'(Canada/Atlantic',
  'Canada/Central':'(Canada/Central)',
  'Canada/Eastern':'(Canada/Eastern)',
  'Canada/Mountain':'(Canada/Mountain)',
  'Canada/Newfoundland':'(Canada/Newfoundland)',
  'Canada/Pacific':'(Canada/Pacific)',
  'Mexico/General': '(Mexico/General)',
  'Mexico/BajaNorte': '(Mexico/BajaNorte)',
  'Mexico/BajaSur': 'Mexico/BajaSur',
  'Brazil/East' : '(Brazil/East)',
  'Brazil/West': '(Brazil/West)',
  'Europe/Amsterdam':'(Europe/Amsterdam)',
  'Europe/Athens':'(Europe/Athens)',
  'Europe/Belfast':'(Europe/Belfast)',
  'Europe/Belgrade':'(Europe/Belgrade)',
  'Europe/Berlin':'(Europe/Berlin)',
  'Europe/Brussels':'(Europe/Brussels)',
  'Europe/Bucharest': '(Europe/Bucharest)',
  'Europe/Budapest': '(Europe/Budapest)',
  'Europe/Dublin':'(Europe/Dublin)',
  'Europe/Helsinki':'(Europe/Helsinki)',
  'Europe/Lisbon':'(Europe/Lisbon)',
  'Europe/London':'(Europe/London)',
  'Europe/Madrid':'(Europe/Madrid)',
  'Europe/Oslo':'(Europe/Oslo)',
  'Europe/Paris':'(Europe/Paris)',
  'Europe/Prague':'(Europe/Prague)',
  'Europe/Rome':'(Europe/Rome)',
  'Europe/Stockholm':'(Europe/Stockholm)',
  'Europe/Vienna':'(Europe/Vienna)',
  'Europe/Warsaw':'(Europe/Warsaw)',
  'Europe/Zurich':'(Europe/Zurich)'
}



/**
 * THe following table and conversion function are not currently being used. The App currently 
 * has and supports a more limited set of timezones. This table is maintained here for future use.
 * 
 * This table and the function below remap a broad set of possible timezones 
 * (currently americas and europe only) limited set that are used in in the user 
 * interface to select the output. The shorter list is used to make the app easier to use.

 */
var tzRemapper = {
'America/Adak' : 'America/Adak',
'America/Anchorage' : 'America/Anchorage',
'America/Anguilla' : 'America/Puerto_Rico',
'America/Antigua' : 'America/Puerto_Rico',
'America/Araguaina' : 'America/Sao_Paulo',
'America/Argentina/Buenos_Aires' : 'America/Sao_Paulo',
'America/Argentina/Catamarca' : 'America/Sao_Paulo',
'America/Argentina/ComodRivadavia' : 'America/Sao_Paulo',
'America/Argentina/Cordoba' : 'America/Sao_Paulo',
'America/Argentina/Jujuy' : 'America/Sao_Paulo',
'America/Argentina/La_Rioja' : 'America/Sao_Paulo',
'America/Argentina/Mendoza' : 'America/Sao_Paulo',
'America/Argentina/Rio_Gallegos' : 'America/Sao_Paulo',
'America/Argentina/Salta' : 'America/Sao_Paulo',
'America/Argentina/San_Juan' : 'America/Sao_Paulo',
'America/Argentina/San_Luis' : 'America/Sao_Paulo',
'America/Argentina/Tucuman' : 'America/Sao_Paulo',
'America/Argentina/Ushuaia' : 'America/Sao_Paulo',
'America/Aruba' : 'America/Puerto_Rico',
'America/Asuncion' : 'America/Puerto_Rico',
'America/Atikokan' : 'America/New_York',
'America/Atka' : 'America/Adak',
'America/Bahia' : 'America/Sao_Paulo',
'America/Bahia_Banderas' : 'America/Chicago',
'America/Barbados' : 'America/Puerto_Rico',
'America/Belem' : 'America/Sao_Paulo',
'America/Belize' : 'America/Chicago',
'America/Blanc-Sablon' : 'America/Puerto_Rico',
'America/Boa_Vista' : 'America/Puerto_Rico',
'America/Bogota' : 'America/New_York',
'America/Boise' : 'America/Denver',
'America/Buenos_Aires' : 'America/Sao_Paulo',
'America/Cambridge_Bay' : 'America/Denver',
'America/Campo_Grande' : 'America/Puerto_Rico',
'America/Cancun' : 'America/New_York',
'America/Caracas' : 'America/Puerto_Rico',
'America/Catamarca' : 'America/Sao_Paulo',
'America/Cayenne' : 'America/Sao_Paulo',
'America/Cayman' : 'America/New_York',
'America/Chicago' : 'America/Chicago',
'America/Chihuahua' : 'America/Denver',
'America/Coral_Harbour' : 'America/New_York',
'America/Cordoba' : 'America/Sao_Paulo',
'America/Costa_Rica' : 'America/Chicago',
'America/Creston' : 'America/Denver',
'America/Cuiaba' : 'America/Puerto_Rico',
'America/Curacao' : 'America/Puerto_Rico',
'America/Danmarkshavn' : 'Europe/Belfast',
'America/Dawson' : 'America/Denver',
'America/Dawson_Creek' : 'America/Denver',
'America/Denver' : 'America/Denver',
'America/Detroit' : 'America/New_York',
'America/Dominica' : 'America/Puerto_Rico',
'America/Edmonton' : 'America/Denver',
'America/Eirunepe' : 'America/New_York',
'America/El_Salvador' : 'America/Chicago',
'America/Ensenada' : 'America/Los_Angeles',
'America/Fort_Nelson' : 'America/Denver',
'America/Fort_Wayne' : 'America/New_York',
'America/Fortaleza' : 'America/Sao_Paulo',
'America/Glace_Bay' : 'America/Puerto_Rico',
'America/Godthab' : 'America/Sao_Paulo',
'America/Goose_Bay' : 'America/Puerto_Rico',
'America/Grand_Turk' : 'America/New_York',
'America/Grenada' : 'America/Puerto_Rico',
'America/Guadeloupe' : 'America/Puerto_Rico',
'America/Guatemala' : 'America/Chicago',
'America/Guayaquil' : 'America/New_York',
'America/Guyana' : 'America/Puerto_Rico',
'America/Halifax' : 'America/Puerto_Rico',
'America/Havana' : 'America/New_York',
'America/Hermosillo' : 'America/Denver',
'America/Indiana/Indianapolis' : 'America/New_York',
'America/Indiana/Knox' : 'America/Chicago',
'America/Indiana/Marengo' : 'America/New_York',
'America/Indiana/Petersburg' : 'America/New_York',
'America/Indiana/Tell_City' : 'America/Chicago',
'America/Indiana/Vevay' : 'America/New_York',
'America/Indiana/Vincennes' : 'America/New_York',
'America/Indiana/Winamac' : 'America/New_York',
'America/Indianapolis' : 'America/New_York',
'America/Inuvik' : 'America/Denver',
'America/Iqaluit' : 'America/New_York',
'America/Jamaica' : 'America/New_York',
'America/Jujuy' : 'America/Sao_Paulo',
'America/Juneau' : 'America/Anchorage',
'America/Kentucky/Louisville' : 'America/New_York',
'America/Kentucky/Monticello' : 'America/New_York',
'America/Knox_IN' : 'America/Chicago',
'America/Kralendijk' : 'America/Puerto_Rico',
'America/La_Paz' : 'America/Puerto_Rico',
'America/Lima' : 'America/New_York',
'America/Los_Angeles' : 'America/Los_Angeles',
'America/Louisville' : 'America/New_York',
'America/Lower_Princes' : 'America/Puerto_Rico',
'America/Maceio' : 'America/Sao_Paulo',
'America/Managua' : 'America/Chicago',
'America/Manaus' : 'America/Puerto_Rico',
'America/Marigot' : 'America/Puerto_Rico',
'America/Martinique' : 'America/Puerto_Rico',
'America/Matamoros' : 'America/Chicago',
'America/Mazatlan' : 'America/Denver',
'America/Mendoza' : 'America/Sao_Paulo',
'America/Menominee' : 'America/Chicago',
'America/Merida' : 'America/Chicago',
'America/Metlakatla' : 'America/Anchorage',
'America/Mexico_City' : 'America/Chicago',
'America/Miquelon' : 'America/Sao_Paulo',
'America/Moncton' : 'America/Puerto_Rico',
'America/Monterrey' : 'America/Chicago',
'America/Montevideo' : 'America/Sao_Paulo',
'America/Montreal' : 'America/New_York',
'America/Montserrat' : 'America/Puerto_Rico',
'America/Nassau' : 'America/New_York',
'America/New_York' : 'America/New_York',
'America/Nipigon' : 'America/New_York',
'America/Nome' : 'America/Anchorage',
'America/North_Dakota/Beulah' : 'America/Chicago',
'America/North_Dakota/Center' : 'America/Chicago',
'America/North_Dakota/New_Salem' : 'America/Chicago',
'America/Nuuk' : 'America/Sao_Paulo',
'America/Ojinaga' : 'America/Denver',
'America/Panama' : 'America/New_York',
'America/Pangnirtung' : 'America/New_York',
'America/Paramaribo' : 'America/Sao_Paulo',
'America/Phoenix' : 'America/Denver',
'America/Port-au-Prince' : 'America/New_York',
'America/Port_of_Spain' : 'America/Puerto_Rico',
'America/Porto_Acre' : 'America/New_York',
'America/Porto_Velho' : 'America/Puerto_Rico',
'America/Puerto_Rico' : 'America/Puerto_Rico',
'America/Punta_Arenas' : 'America/Sao_Paulo',
'America/Rainy_River' : 'America/Chicago',
'America/Rankin_Inlet' : 'America/Chicago',
'America/Recife' : 'America/Sao_Paulo',
'America/Regina' : 'America/Chicago',
'America/Resolute' : 'America/Chicago',
'America/Rio_Branco' : 'America/New_York',
'America/Rosario' : 'America/Sao_Paulo',
'America/Santa_Isabel' : 'America/Los_Angeles',
'America/Santarem' : 'America/Sao_Paulo',
'America/Santiago' : 'America/Puerto_Rico',
'America/Santo_Domingo' : 'America/Puerto_Rico',
'America/Sao_Paulo' : 'America/Sao_Paulo',
'America/Shiprock' : 'America/Denver',
'America/Sitka' : 'America/Anchorage',
'America/St_Barthelemy' : 'America/Puerto_Rico',
'America/St_Johns' : 'Canada/Newfoundland',
'America/St_Kitts' : 'America/Puerto_Rico',
'America/St_Lucia' : 'America/Puerto_Rico',
'America/St_Thomas' : 'America/Puerto_Rico',
'America/St_Vincent' : 'America/Puerto_Rico',
'America/Swift_Current' : 'America/Chicago',
'America/Tegucigalpa' : 'America/Chicago',
'America/Thule' : 'America/Puerto_Rico',
'America/Thunder_Bay' : 'America/New_York',
'America/Tijuana' : 'America/Los_Angeles',
'America/Toronto' : 'America/New_York',
'America/Tortola' : 'America/Puerto_Rico',
'America/Vancouver' : 'America/Los_Angeles',
'America/Virgin' : 'America/Puerto_Rico',
'America/Whitehorse' : 'America/Denver',
'America/Winnipeg' : 'America/Chicago',
'America/Yakutat' : 'America/Anchorage',
'America/Yellowknife' : 'America/Denver',
'Canada/Atlantic' : 'Canada/Atlantic',
'Canada/Central' : 'Canada/Central',
'Canada/Eastern' : 'Canada/Eastern',
'Canada/Mountain' : 'Canada/Mountain',
'Canada/Newfoundland' : 'Canada/Newfoundland',
'Canada/Pacific' : 'Canada/Pacific',
'Canada/Saskatchewan' : 'Canada/Saskatchewan',
'Europe/Amsterdam' : 'Europe/Amsterdam',
'Europe/Andorra' : 'Europe/Amsterdam',
'Europe/Athens' : 'Europe/Athens',
'Europe/Belfast' : 'Europe/Belfast',
'Europe/Belgrade' : 'Europe/Amsterdam',
'Europe/Berlin' : 'Europe/Amsterdam',
'Europe/Bratislava' : 'Europe/Amsterdam',
'Europe/Brussels' : 'Europe/Amsterdam',
'Europe/Bucharest' : 'Europe/Athens',
'Europe/Budapest' : 'Europe/Amsterdam',
'Europe/Busingen' : 'Europe/Amsterdam',
'Europe/Chisinau' : 'Europe/Athens',
'Europe/Copenhagen' : 'Europe/Amsterdam',
'Europe/Dublin' : 'Europe/Amsterdam',
'Europe/Gibraltar' : 'Europe/Amsterdam',
'Europe/Guernsey' : 'Europe/Belfast',
'Europe/Helsinki' : 'Europe/Athens',
'Europe/Isle_of_Man' : 'Europe/Belfast',
'Europe/Jersey' : 'Europe/Belfast',
'Europe/Kaliningrad' : 'Europe/Athens',
'Europe/Kiev' : 'Europe/Athens',
'Europe/Lisbon' : 'Europe/Belfast',
'Europe/Ljubljana' : 'Europe/Amsterdam',
'Europe/London' : 'Europe/Belfast',
'Europe/Luxembourg' : 'Europe/Amsterdam',
'Europe/Madrid' : 'Europe/Amsterdam',
'Europe/Malta' : 'Europe/Amsterdam',
'Europe/Mariehamn' : 'Europe/Athens',
'Europe/Monaco' : 'Europe/Amsterdam',
'Europe/Nicosia' : 'Europe/Athens',
'Europe/Oslo' : 'Europe/Amsterdam',
'Europe/Paris' : 'Europe/Amsterdam',
'Europe/Podgorica' : 'Europe/Amsterdam',
'Europe/Prague' : 'Europe/Amsterdam',
'Europe/Riga' : 'Europe/Athens',
'Europe/Rome' : 'Europe/Amsterdam',
'Europe/San_Marino' : 'Europe/Amsterdam',
'Europe/Sarajevo' : 'Europe/Amsterdam',
'Europe/Skopje' : 'Europe/Amsterdam',
'Europe/Sofia' : 'Europe/Athens',
'Europe/Stockholm' : 'Europe/Amsterdam',
'Europe/Tallinn' : 'Europe/Athens',
'Europe/Tirane' : 'Europe/Amsterdam',
'Europe/Tiraspol' : 'Europe/Athens',
'Europe/Uzhgorod' : 'Europe/Athens',
'Europe/Vaduz' : 'Europe/Amsterdam',
'Europe/Vatican' : 'Europe/Amsterdam',
'Europe/Vienna' : 'Europe/Amsterdam',
'Europe/Vilnius' : 'Europe/Athens',
'Europe/Warsaw' : 'Europe/Amsterdam',
'Europe/Zagreb' : 'Europe/Amsterdam',
'Europe/Zaporozhye' : 'Europe/Athens',
'Europe/Zurich' : 'Europe/Amsterdam'
}

// Get one of the supported timezone given the user's specification
function findDefaultTimeZone(userTz) {

  var ret = tzRemapper[userTz]; 

  if(ret == null) {
    ret = 'America/New_York';
  }

  var diff =  tzDiff(ianatz);

  var dt =  new Date((((t.hours*60) + t.minutes) * 60 * 1000) + diff   );
  
  Logger.log("makeDateFromTime 2" + JSON.stringify(t) + " " + diff + " " + ianatz + ' ' + dt );
  return dt;
}

