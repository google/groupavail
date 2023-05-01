
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

/*
 * Variables that will require changes when deployed to a given workspace domain
 */

/* version shown in UI and log messages sicne multiple marketplace based deployments could be active at the same time */
const version  =  "V20230505";

/* Workspace domain string */
const WORKSPACE_DOMAIN = "google.com";

/* Regular expression to select schedulees your organizations email domain specified in from the to/cc/bcc lines */
const DOMAINREGEX = /@google.com/;

/* URL of Icon to use to display button at the bottom of the Gmail componse window */
const ICON_URL = "https://fonts.gstatic.com/s/i/googlematerialicons/date_range/v11/gm_blue-48dp/1x/gm_date_range_gm_blue_48dp.png";
const LOGO_URL = "https://lh3.googleusercontent.com/-aCIapqbJqEc/YO1yHsEF3MI/AAAAAAAAAgE/xkNbuIl37lgKXaxamq3NXGTjLXJxpvJ6gCNcBGAsYHQ/s400/GroupAvailV2-128x128.png";

/* Error text to display to users when GroupAvail encounters an error during use */
const ERROR_MESSAGE = "\n\n</i>See <A href=\"https://sites.google.com/corp/google.com/groupavail/news\"> GroupAvail News</A> for information about known issues and where to report issues and get help.\n\n";

/* set to the GA ID if Google Analytics is used to track usage  */
const GOOGLE_ANALYTICS_ID = 'UA-197145930-1';

/* URL of an internal web page describing GroupAvail to users */
const ABOUT_URL = 'https://goto2.corp.google.com/groupavail';