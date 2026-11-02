---
title: "Building a Serverless Naver News Bot with Google Apps Script"
description: "A real-time news monitoring replacement for Naver News RSS: why I built it with Google Apps Script, how it works, and the problems I encountered and solved."
pubDate: "2022-05-02T13:24:47.000Z"
updatedDate: "2022-09-21T05:39:21.000Z"
tags: ["google-apps-script"]
featureImage: "/content/images/2022/05/cover-1.jpg"
lang: en
---

It began simply. One day, my partner asked from work:

> "Could we receive news mentioning our company in the company chat room in real time?"
> "Naver News RSS has stopped. Is there another way to receive news without visiting Naver?"

Even if I have never done something, I tend to start if it looks possible. This was also a tool I had wanted to build since my consulting days long ago. And now someone I loved needed it. So I made **[Naver News Fetching Bot](https://github.com/seongjinme/naver-news-fetching-bot)**.

![A news item delivered by the bot to a Microsoft Teams channel](/content/images/2022/05/screenshot_pc_teams.gif)

**[Naver News Fetching Bot](https://github.com/seongjinme/naver-news-fetching-bot)** is a **serverless bot built on Google Apps Script**. It sends the latest Naver News matching a search keyword to **Slack, Microsoft Teams, Jandi, or Google Chat**. Originally, it simply forwarded RSS data to Google Chat. This March I rebuilt it around Naver's Open API, then added Slack, Teams, and Jandi support in turn.

This article introduces the design decisions and implementation, with code, along with problems encountered and how I solved them.

## Design considerations

### What is the tool for?

I built it for **PR and marketing work requiring real-time news monitoring**. Monitoring is the first step in managing a company, brand, or product's reputation, watching market trends, and quickly identifying and responding to business risks.

Public and private organizations had generally relied on Naver News RSS, adding feed URLs to Slack or Jandi. **Naver completely discontinued News RSS in March 2022**, making that impossible. **Google News covers too few outlets and misses many articles**. Repeated manual searches are inefficient, and continual crawling feels excessive for the benefit.

**Naver News Fetching Bot** addresses this with Apps Script triggers: at the chosen interval, fetch the latest news from Naver's Open API and immediately share it in a group chat through a webhook. Simple and efficient.

### Why Google Apps Script?

I initially considered cloud FaaS such as AWS Lambda or Google Cloud Run. I switched after **considering the working environment of the people who would actually use the bot**.

Professional boundaries are blurring, but cloud and serverless concepts remain unfamiliar to many nondevelopers. Account creation, permission management, and billing complicate adoption. Even a program that seems trivial to a developer can have a high entry barrier for users. I wanted to lower it.

Apps Script has three advantages:

1. **Accessibility:** Anyone with a Google account can start. It integrates with Google Workspace, already used in many workplaces.
2. **Ease of use:** A browser IDE, straightforward triggers and logs, and JavaScript as the language.
3. **No cost:** I have repeatedly seen useful solutions go unused simply because of resistance to cost. Apps Script lets individual workers test and adopt a tool without that burden.

### Why incoming webhooks?

An **incoming webhook** is the simplest way to send external data to a collaboration chat tool: make an HTTP POST containing JSON to the room's webhook URL.

Many tools support this. Format fields to match each tool's JSON structure and send the request. The code is easy to maintain and extend.

## Implementation

> 💡 The following excerpts are from `v2.2.2`, updated in August 2022. Much changed during updates, so I revised this explanation. See [my GitHub repository](https://github.com/seongjinme/naver-news-fetching-bot) for the latest code.
> Updated: August 25, 2022.

### 1. Global settings

`globalVariables()` groups the main settings into an object that can be retrieved as needed. Users only need to edit this part of the code:

```js
function globalVariables() {
  return values = {

    // Debug mode
    DEBUG            : false,

    // Naver Search Open API client ID and secret
    clientId         : "[Naver Open API Client ID]",
    clientSecret     : "[Naver Open API Client Secret]",

    // Naver News search keyword
    keyword          : "[search-keyword]",

    // Slack delivery settings
    allowBotSlack    : false,
    webhookSlack     : "[URL]",

    // Microsoft Teams delivery settings
    allowBotTeams    : false,
    webhookTeams     : "[URL]",

    // JANDI delivery settings
    allowBotJandi    : false,
    webhookJandi     : "[URL]",

    // Google Chat Space delivery settings
    allowBotGoogle   : false,
    webhookGoogle    : "[URL]",

    // Google Sheets archiving settings
    allowArchiving   : false,
    spreadsheetId    : "[SPREADSHEET_ID]",
    sheetName        : "[SPREADSHEET_SHEET_NAME]",
    sheetTargetCell  : "[SPREADSHEET_SHEET_NAME]!A2"

  };
}
```

### 2. Calling Naver's API and running the bot

`runFetchingBot()` is the entry point executed by Apps Script triggers. It:

1. Validates required settings.
2. Detects the first run.
3. Detects search keyword changes.
4. Fetches news using `globalVariables()`.
5. Processes data if the response is `200`.

First, validate settings and check first-run and keyword status:

```js
function runFetchingBot() {

  // Load the bot configuration.
  const g = globalVariables();

  ...

  // Check PropertiesService for lastArticleUpdateTime and registeredKeyword.
  const lastArticleUpdateTime = getProperty("lastArticleUpdateTime") ? new Date(parseFloat(getProperty("lastArticleUpdateTime"))) : null;
  const registeredKeyword = getProperty("registeredKeyword") ? getProperty("registeredKeyword") : null;

  ...
```

Naver's search API allows between `10` and `100` results. To avoid duplicates, process only items published after the last delivered article. **On the first run, that timestamp is unknown**, so all requested articles could flood the room with notifications. I added first-run detection to prevent that.

Through `v2.2.1`, the bot merely remembered its first execution time and began sending news on the next run. Users could not immediately tell whether installation had succeeded. From `v2.2.2`, it instead **sends an installation-complete message and one recent article as a sample**.

I also added **a keyword-change notification** when the configured search term changes. The new `registeredKeyword` variable supports this.

`PropertiesService` remembers both the last delivery time and the registered keyword. It stores key-value pairs beyond an individual script execution. More on that below under development issues.

Next, retrieve the feed:

```js
  ...

  // Use lastArticleUpdateTime to detect the first run and retrieve the feed.
  if (!lastArticleUpdateTime) {
    feed = getFeed(g.keyword, g.clientId, g.clientSecret, true);
    Logger.log("* Starting news bot setup.\n");
  }
  else {
    feed = getFeed(g.keyword, g.clientId, g.clientSecret);
  }

  // Check the feed and run the bot if its response code is 200.
  if (feed.getResponseCode() == 200) {

    // On the first run, save registeredKeyword and send a notification.
    if (!lastArticleUpdateTime) {
      Logger.log("* Naver News search keyword registered : '" + g.keyword + "'\n");
      setProperty("registeredKeyword", g.keyword);

      Logger.log("* Sending one recent article as a sample for the registered keyword.\n");
      postMessage(g, welcomeMessage(g.keyword));
    }

    else {

      // If the keyword changed, update registeredKeyword and notify the user.
      if (registeredKeyword != g.keyword) {
        Logger.log("* Naver News search keyword changed : '" + registeredKeyword + "' -> '"+ g.keyword + "'\n");
        postMessage(g, changeKeywordMessage(registeredKeyword, g.keyword));
        setProperty("registeredKeyword", g.keyword);
      }

      Logger.log("* Last news delivery time : " + lastArticleUpdateTime);
      Logger.log("* Starting Naver News keyword search : '" + g.keyword + "'");
    }

    getArticle(g, feed, lastArticleUpdateTime);

  }

  // For non-200 responses, log headers and content for diagnosis.
  else {
    Logger.log("* An error occurred while fetching news. Check the logs.\n");
    Logger.log(feed.getHeaders());
    Logger.log(feed.getContentText());
    return;
  }

}
```

The code is long but straightforward. `getFeed()` selects the feed according to first-run status. With response `200`, it calls `getArticle()`; otherwise it logs the error and exits. `setProperty()` stores values in `PropertiesService`, and `postMessage()` sends a message to the chat app.

Here is `getFeed()`:

```js
function getFeed(keyword, clientId, clientSecret, startup=false) {

  const feedUrl = getFeedUrl(keyword, startup);
  const options = {
    "method": "get",
    "headers": {
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret
    }
  };

  return UrlFetchApp.fetch(feedUrl, options);

}
```

Apps Script's `UrlFetchApp` handles HTTP requests. `.fetch()` sends a request, while `.getResponseCode()` checks its status.

### 3. Processing news data

Select `$.channel.item[*]` from the returned data. Since the API returns reverse chronological order, use `.reverse()` to process the newest item last:

```js
function getArticle(g, feed) {

  // Retrieve news items, sort chronologically, and start processing.
  const xml = XmlService.parse(feed.getContentText());
  const items = xml.getRootElement().getChild('channel').getChildren('item').reverse();

  ...
```

**Naver's search API cannot filter by hours, minutes, or seconds.** The code therefore processes only items published after `lastArticleUpdateTime`. For each, it extracts `title`, `link`, `source`, `description`, and `pubDateText`, passing them to `postArticle()` and `archiveArticle()`:

```js
  ...

  let cnt = 0;
  let archiveItems = [];

  for (let i = 0; i < items.length; i++) {

    const pubDate = new Date(items[i].getChildText('pubDate'));

    if (!lastArticleUpdateTime || pubDate > lastArticleUpdateTime) {

      // Extract each item's data fields.
      const title = bleachText(items[i].getChildText('title'));
      const link = items[i].getChildText('link');
      const source = getSource(items[i].getChildText('originallink'));
      const description = bleachText(items[i].getChildText('description'));
      const pubDateText = Utilities.formatDate(pubDate, "GMT+9", "yyyy-MM-dd HH:mm:ss");

      // In DEBUG mode, log processed data without chat delivery or archiving.
      if (g.DEBUG) {
        Logger.log("----- " + items.length + " items; item " + (i + 1) + " -----");
        Logger.log(pubDateText + "\n" + title + "\n" + source + "\n" + link + "\n" + description);
      }

      // Outside DEBUG mode, deliver and archive news.
      else {
        Logger.log("'" + title + "' Posting item...");

        if (g.allowBotSlack || g.allowBotTeams || g.allowBotJandi || g.allowBotGoogle) {
          postArticle(g, pubDateText, title, source, description, link);
        }

        if (g.allowArchiving) {
          archiveItems[archiveItems.length] = [pubDateText, title, source, link, description];
        }
      }

      // Update the last news timestamp in PropertiesService.
      setProperty("lastArticleUpdateTime", pubDate.getTime());
      cnt++;

    }

  }

  Logger.log("* Total: " + parseInt(cnt, 10) + " items posted.");

  // Outside DEBUG mode, send new items to Sheets if archiving is enabled.
  if (!g.DEBUG && g.allowArchiving && cnt > 0) {
    archiveArticle(g.spreadsheetId, g.sheetName, g.sheetTargetCell, archiveItems);
  }

}
```

Keyword searches return HTML emphasis tags in titles and descriptions. Some special characters also arrive as HTML entities. `bleachText()` removes tags and restores the characters:

```js
function bleachText(text) {

  // Remove HTML tags and restore special characters from entities.
  text = text.replace(/(<([^>]+)>)/gi, '');
  text = text.replace(/&quot;/gi, '"');
  text = text.replace(/&#039;/gi, "'");
  text = text.replace(/&lt;/gi, '<');
  text = text.replace(/&gt;/gi, '>');
  text = text.replace(/&amp;/gi, '&');
  text = text.replace(/`/gi, "'");
  text = text.replace(/&apos;/gi, "'");

  return text;

}
```

However, **Naver's API still does not provide outlet names as of August 2022**. Outlet identity matters in news monitoring, so I needed a workaround, discussed below.

### 4. Sending news

With data processed, send it. Use [UrlFetchApp](https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app)'s `.fetch()` to POST to the chat room's incoming webhook URL. Each platform's payload format controls the layout; consult its documentation:

```js
async function postArticle(g, pubDateText, title, source, description, link) {

  // Define delays for each chat platform's per-second or per-minute request limits.
  // Source : https://stackoverflow.com/a/39914235
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  if (g.allowBotSlack) {
    const article = createArticleCardSlack(pubDateText, title, source, description, link);
    const params = {
      "method": "post",
      "contentType": "application/json",
      "payload": JSON.stringify(article)
    };
    UrlFetchApp.fetch(g.webhookSlack, params);
  }

  ...

  // Wait before the next item to respect platform request limits.
  await sleep(200);

}
```

Apps Script integrates closely with Sheets through [SpreadsheetApp](https://developers.google.com/apps-script/reference/spreadsheet/spreadsheet-app). I used it to implement archiving:

```js
function archiveArticle(spreadsheetId, sheetName, sheetTargetCell, archiveItems) {

  const ss = SpreadsheetApp.openById(spreadsheetId);

  // If sheetName does not exist, create the sheet with a header.
  if (!ss.getSheetByName(sheetName)) {
    ss.insertSheet(sheetName, 1);

    const headerRange = Sheets.newValueRange();
    headerRange.values = [["Date/time", "Title", "Outlet", "URL", "Content"]];

    const headerTargetCell = sheetName + "!A1";

    Sheets.Spreadsheets.Values.update(headerRange, spreadsheetId, headerTargetCell, {
      valueInputOption: 'RAW'
    });
  }

  const ws = ss.getSheetByName(sheetName);

  ws.insertRowsBefore(2, archiveItems.length);
  const valueRange = Sheets.newValueRange();
  valueRange.values = archiveItems.reverse();

  Sheets.Spreadsheets.Values.update(valueRange, spreadsheetId, sheetTargetCell, {
    valueInputOption: 'USER_ENTERED'
  });

}
```

## Development issues

### 1. Remembering the last update time

Apps Script runs a script once per event. Each trigger or command starts a new environment that ends with execution. It offers no [temporary execution cache like AWS Lambda](https://blog.hoseung.me/2022-02-27-lambda-global-variables/). How could I remember the last update and send only unseen news? The official documentation led me to **PropertiesService**:

- [Class PropertiesService | Apps Script | Google Developers](https://developers.google.com/apps-script/reference/properties/properties-service)

[PropertiesService](https://developers.google.com/apps-script/reference/properties/properties-service) stores arbitrary key-value pairs for scripts. Three methods with different access scopes provide [Properties](https://developers.google.com/apps-script/reference/properties/properties) objects. I used `.getScriptProperties()` to restrict access to this script and record the latest timestamp after each run.

### 2. Storing timestamps in PropertiesService

All stored keys and values are strings. I expected `parseInt()` to recover the last update time, but tests kept returning the same news without duplicate filtering.

Logs showed the converted timestamp was `1`. Reading the original value revealed:

![An exponential string was returned instead of an integer timestamp.](/content/images/2022/05/propertiesservice_log.png)

I learned that **JavaScript and Apps Script store numbers as IEEE-754 floating-point values**. [See this explanation.](https://stackoverflow.com/questions/18719775/parsing-and-converting-exponential-values-to-decimal-in-javascript) The console displays a decimal conversion, but memory representation differs. The timestamp had been stored as an exponential string; `parseInt()` discarded everything after the decimal point, producing the result above.

I replaced `parseInt()` with `parseFloat()`, which also [converts strings containing e or E notation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/parseFloat#description). The converted timestamp again produced the intended `Date` object:

![parseFloat resolves the timestamp issue.](/content/images/2022/05/propertiesservice_fixed.png)

### 3. Missing outlet names

Oddly, Naver's API omits outlet names, though it includes `originallink`. I decided to identify outlets from the domains in those URLs.

A separate crawl collected the necessary mapping. I retrieved **around eighty thousand articles** across six categories: politics, economy, international, culture, sports, and regional news, including Seoul, Gyeonggi, Gangwon, Chungbuk, Chungnam, Jeonbuk, Jeonnam, Gyeongbuk, Gyeongnam, and Jeju. I extracted **736 outlet names and domains**, preprocessed them in Excel, and stored nested `["domain", "outlet"]` arrays in `listSource()`. [The result is here.](https://github.com/seongjinme/naver-news-fetching-bot/blob/main/source.gs)

![Sometimes the simplest approach is what is needed.](/content/images/2022/05/listsource.png)

Here is the identification code. Unknown outlets once appeared as `(unknown)`. Since August 2022, a regular expression extracts and displays the original domain instead. A marketer using the bot suggested this improvement; I am grateful for the idea.

```js
function getSource(originallink) {

  // Load the outlet URL list from source.gs.
  const list = listSource();

  // Remove unnecessary parts of the original article URL.
  const address = originallink.toLowerCase().replace(/^(https?:\/?\/?)?(\/?\/?www\.)?(\/?\/?news\.)?(\/?\/?view\.)?(\/?\/?post\.)?(\/?\/?photo\.)?(\/?\/?photos\.)?(\/?\/?blog\.)?/, "");
  const domain = address.match(/^([^:\/\n\?\=]+)/)[0];

  // Return the outlet matching the URL, or its domain if no match is found.
  const index = searchSourceIndex(address, list);
  if (index >= 0 && index <= list.length - 1) {
    return list[index][1];
  }
  else if (domain) {
    return domain;
  }
  else {
    return "(unknown)";
  }

}
```

The remaining task was searching the nested array for the matching outlet. The first release used **sequential search**, the easiest implementation. Since the data could be sorted, I switched to **binary search** in May 2022 for better computational efficiency:

```js
function searchSourceIndex(address, list) {

  let left = 0;
  let right = list.length - 1;

  while (left <= right) {

    let index = Math.floor((left + right) / 2);
    let address_stripped = address.substr(0, list[index][0].length);

    if (address_stripped === list[index][0]) {
      return checkSourceIndex(index, list, address, address_stripped);
    }
    else if (address_stripped < list[index][0]) {
      right = index - 1;
    }
    else {
      left = index + 1;
    }

  }

  return -1;

}
```

Binary search, however, has difficulties with duplicate ranges. Different outlets sharing a domain, such as Forbes Korea at `jmagazine.joins.com/forbes` and Monthly JoongAng at `jmagazine.joins.com/monthly`, could be confused.

I resolved this by adding a step that checks whether outlet paths after the initially found index occur in the original URL:

```js
function checkSourceIndex(index, list, address, address_stripped) {

  let i = index;

  // Check for additional subpaths containing the outlet path found by addressSearch().
  while (i + 1 <= list.length - 1) {
    if (list[i + 1][0].includes(address_stripped)) {
      i++;
    }
    else {
      break;
    }
  }

  // Without additional subpaths, return the original outlet index.
  if (i === index) {
    return index;
  }

  // Otherwise, check from the right end of the matching range and return the matching outlet index.
  while (i >= index) {
    if (address.includes(list[i][0])) {
      return i;
    }
    i--;
  }

  return -1;

}
```

This substantially improved total search time. In cloud environments where computation time affects billing, a small change can make a large difference:

![Search performance before and after the algorithm change](/content/images/2022/05/press_search_test.png)

## Closing

Even for a short script running once on a particular platform, devising and implementing solutions was challenging as a beginner. Fortunately, revisiting [the JavaScript basics I learned in a little over a week of Harvard CS50x](https://cs50.harvard.edu/x/2021/notes/8/#javascript) helped me solve the problems. It also sparked an interest in building for FaaS environments. A small experience toward greater growth was enough to satisfy me.

While adding Slack support last March, I unexpectedly received a thank-you email from a user. A tool made for one person could help others too. That memory prompted this article. I hope it helps anyone needing a Naver News RSS replacement, chat integration through Apps Script, or workplace automation.
