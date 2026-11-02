---
title: "Why I Chose Ghost as the CMS for My First Technical Blog"
description: "One of the hardest decisions when starting a technical blog is choosing a blogging tool. Here are the five requirements I considered and why I chose Ghost."
pubDate: "2022-01-10T06:12:32.000Z"
updatedDate: "2022-02-08T06:56:54.000Z"
tags: ["career", "essay", "blog", "ghost-tag"]
lang: en
---

It took me a long time to create this blog. Unfortunately, I spent most of that time trying to decide which environment and tools to rely on. That included comparing WordPress and other blogging tools one by one, exploring the [static site generators (SSGs)](https://www.cloudflare.com/learning/performance/static-site-generator/#:~:text=A%20static%20site%20generator%20is,to%20users%20ahead%20of%20time.) widely used these days, and even [making a clumsy attempt at building my own blogging tool with Flask](https://github.com/seongjinme/tiny-blogger).

The conclusion of that long journey was rather deflating: I had lost sight of the point. Somewhere along the way, finding a tool to help me had become finding a tool to make my space look impressive to other people. I was like a carpenter looking for gold-plated tools to carve a wooden club.

The only thing that needs to stand out on a blog is its content. A blogging tool should first and foremost take the friction out of producing that content. A cutting-edge stack chosen without regard for its purpose offers little more than a sense of competence.

## Five requirements for my blogging environment

I reconsidered what I actually wanted. My goal was **a technical blog with an environment that would let me focus entirely on writing**. With that as my priority, I narrowed down the requirements:

1. Writing in Markdown, including code, should be straightforward.
2. My everyday writing environment should connect naturally to the blog.
3. User interactions unrelated to writing and publishing should be kept to a minimum.
4. Data and system maintenance should be simple.
5. I should not be locked into a particular platform service.

Once the goal and requirements were clear, I spent much less time deliberating. Most existing blogging tools and platforms failed to meet requirements 1 through 4. Static site generators had technical appeal, but the extra steps required every time I wrote or managed a post meant they failed requirement 3.

I wanted a tool that would meet all five requirements as fully as possible, without compromise. My choice was [Ghost](https://ghost.org/).

## Why Ghost

![The default Ghost blog theme](/content/images/2022/01/Ghost.jpg)

[Ghost](https://ghost.org/) is an open-source CMS. It offers the speed, uncluttered interface, and clean design I wanted. Its writing environment is comparable to [Medium](https://medium.com/), with support for custom domains, styles, and plugins. Above all, I liked its seamless integration with [Ulysses](https://ulysses.app/), the writing tool I already use.

![](/content/images/2022/01/Ulysses_1.jpg)

![Publish directly from Ulysses, view information about published posts, and update them.](/content/images/2022/01/Ulysses_2.jpg)

With [Ulysses](https://ulysses.app/) connected to [Ghost](https://ghost.org/), [drafting, publishing, and updating flow smoothly into one another](https://help.ulysses.app/integrations/publish-to-ghost). Once the system is in place, I can run the blog as part of my normal writing routine. There is no need to edit the post again in a blogging tool or repeatedly run builds to generate pages. It fits my goal of focusing entirely on writing almost perfectly.

I am happy with my current blogging environment. It may not be perfect, but it feels like the best choice for me right now.

## Be clear about your purpose and needs

My criteria cannot be everyone's criteria. My reasons for choosing [Ghost](https://ghost.org/) as a technical blog CMS come entirely from my habits and priorities. For someone unfamiliar with Linux, [Ghost](https://ghost.org/) still has a substantial barrier to entry. Someone already comfortable with these tools and technologies may have plenty of useful alternatives. The [Ulysses](https://ulysses.app/) and [Ghost](https://ghost.org/) integration that appealed so much to me will mean nothing to someone unwilling to pay $50 a year for a Markdown editor.

Blogging is ultimately about making content. Just as we consider the working environment that helps us work efficiently, we should first consider which environment will best support us as content creators. Choosing the tool comes afterward. Searching for cutting-edge tools without a clear purpose or need is unproductive in the long run and wastes a great deal of energy along the way. Building this blog taught me that firsthand.
