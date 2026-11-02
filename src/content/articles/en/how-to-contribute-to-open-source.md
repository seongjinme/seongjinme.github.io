---
title: "A Beginner’s Guide to Contributing to Open Source on GitHub"
description: "How to contribute to an open-source project on GitHub, illustrated by my small but personally meaningful first contribution."
pubDate: "2022-05-26T14:09:12.000Z"
tags: ["github"]
featureImage: "/content/images/2022/05/cover-1.png"
lang: en
---

This blog uses a plugin called [SearchinGhostEasy](https://github.com/gmfmi/searchinghost-easy) for full-text search, because [Ghost, my blogging platform, does not support search](https://ghost.org/docs/search/). I was happy with it in many ways, but one small inconvenience bothered me: **on iOS**, the text input area was misaligned when opening the search form.

![Left: before the fix. Right: after the fix.](/content/images/2022/05/searchinghosteasy-fixed.png)

Fortunately, adding missing `padding` to the form's `<input>` fixed it easily. I was satisfied and left it there. A couple of months later, a thought occurred to me: **if the fix were included in the author's distributed code, wouldn't that help other people with the same problem?** I searched for documentation on **contributing to open source**, stumbled through countless attempts, and [submitted my first pull request last March](https://github.com/gmfmi/searchinghost-easy/pull/6). It may be trivial to some, but for someone feeling his way through GitHub, it was exciting.

Based on that experience, this article explains **how to contribute to open-source projects on GitHub**. It is for readers who have some understanding of Git, have used GitHub, and want to contribute but do not know where to begin.

## Learn the prerequisites

If Git is unfamiliar or you have never used GitHub, start with these:

- [An accessible introduction to Git](https://backlog.com/git-tutorial/kr/): A straightforward introduction to version control. Some content is old, so I recommend focusing on the console-based sections.
- [Harvard's CS50w Lecture 1: Git](https://www.youtube.com/watch?v=NcoBAfJ6l2Q): The Git lecture from Harvard's web development MOOC. Though in English, it is helpful for understanding the concepts. Read the [official notes](https://cs50.harvard.edu/web/2020/notes/1/) alongside it.
- [Git & GitHub introduction by CodeSquad](https://edu.goorm.io/lecture/4661/git-github-%EC%9E%85%EB%AC%B8-by-%EC%BD%94%EB%93%9C%EC%8A%A4%EC%BF%BC%EB%93%9C): A free introductory course in Korean on Goorm EDU.

## Choose a project

Once familiar with Git and GitHub, find a project to contribute to.

There are countless open-source projects. Without criteria, the search can become a needle in a haystack. As a beginner, I chose these:

1. **I must have used it at least once.** You need to know something before improving it. Experienced contributors may pick an issue from a repository, but beginners are better off starting with something familiar.
2. **User contributions must be active.** Does the project encourage participation and respond to unfamiliar people raising issues or proposing changes? The Issues and Pull Requests lists give a sense of its atmosphere.
3. **The latest commit must be within the past year.** A project without a commit in a year may no longer be maintained, leaving your work unlikely to be accepted.
4. **Do not start with something enormous.** Popular projects are often highly developed through dozens of contributors. Understanding issue context and future directions takes effort. Until you become comfortable contributing, I suggest starting small.

The quickest and easiest route for a beginner is **choosing a project you already use**. Experience helps you identify improvements, and seeing their immediate effect in your own environment is personally rewarding.

## Choose the work

Next, decide what to contribute.

Complex code is not the only meaningful contribution. **Find something within your ability and do as much as you can.** Anything can be improved. As many people have emphasized, fixing small typos in documentation or comments, correcting translations, or adding missing ones are valuable contributions. You may also find a simple bug like mine.

If you cannot see where to start, read the repository's Issues. Questions, bug reports, and improvement discussions happen there. Find something you could help with and comment, or propose an improvement yourself.

## Make the contribution

With a project and direction selected, let us work through **forking**, **creating a branch**, **committing and pushing**, and **opening a pull request** against the original repository.

GitHub collaboration assumes **multiple people working remotely and asynchronously**. Even simple changes therefore involve several steps. There are many steps, but they are not especially difficult in practice. Take them one at a time.

### 1. Fork the project repository

First, **fork** the project's remote repository into your GitHub account. A fork is a copy of another project's repository under your account.

Log in on your computer, open the project repository, and click `Fork` at the upper right:

![](/content/images/2022/05/step-1-1-fork.png)

The copy appears in your account with `forked from (original project)`. Clone it locally with `git clone (fork URL)` to finish the basic setup:

![](/content/images/2022/05/step-1-2-clone.png)

Why do this? Most open-source repositories allow direct writes only from authorized people. Letting anyone insert arbitrary code would be a problem. Instead, **record your changes in your fork**, then **request their inclusion in the original through a pull request**.

#### Clone versus fork

Both copy another repository, but:

- **Clone** copies a remote repository to your local computer. You can push changes directly back only if you have write access.
- **Fork** creates a remote copy under your GitHub account, retaining a relationship to the original. You can incorporate upstream changes with `fetch` or `rebase`, and request that your changes be pulled into the original through a pull request.

### 2. Keep your fork up to date

A fresh fork matches the original, but others may update the original while you work. Submitting changes based on an old version can produce this:

![Seeing a conflict while preparing a pull request can be unsettling.](/content/images/2022/05/step-2-1-conflict.png)

**Keeping your fork current matters**, especially for work taking some time.

In the directory cloned in step 1, run:

```bash
# Format: git remote add (remote-name) (remote-URL)
git remote add upstream (original-project-repository-URL)
```

This adds a remote named `upstream` pointing to the original repository. Check remotes with `git remote -v`:

![](/content/images/2022/05/step-2-2-remote-add.png)

- `origin`: Your fork, which you cloned locally and where your changes will be pushed.
- `upstream`: The original project, from which you obtain new updates.

Update your repository with these commands in order:

```bash
# Fetch the latest code from upstream.
git fetch upstream

# Check out the working branch that will receive upstream changes.
git checkout master

# Merge the fetched changes into the working branch.
# git merge (upstream-remote/branch-name)
git merge upstream/master

# Update the fork on GitHub too.
git push origin master
```

This screenshot shows my actual update. Since I fetched immediately after forking, there were no changes and Git reported `Already up to date.` I omitted `git push` because my remote fork also needed no update. If upstream has changed, `git merge` shows which files changed and how.

![](/content/images/2022/05/step-2-3-fetch.png)

### 3. Create a working branch

For a tiny documentation typo, working directly on `main` or `master` may be fine. For features, improvements, or bugs, a separate branch makes the intended issue clear.

I was fixing CSS for the `backpack` template, so I created `fix-backpack-css`:

```bash
# Create a branch with the desired name.
git branch fix-backpack-css

# Switch to the new branch.
git checkout fix-backpack-css

# Optional: combine the two commands as follows.
git checkout -b fix-backpack-css
```

![](/content/images/2022/05/step-3-1-branch.png)

### 4. Push your work to your repository

Now write the code. Commit and push your changes on the branch created above. My change was small enough for a single commit:

![](/content/images/2022/05/step-4-1-commit.png)

### 5. Send a pull request to the original project

Open your working repository on GitHub. You should see `Compare & pull request`:

![](/content/images/2022/05/step-5-1-compare-button.png)

Click it to open a pull request against the original project:

![](/content/images/2022/05/step-5-2-pr-form.png)

Check the original repository and branch receiving the PR, and your repository and branch containing the changes:

![](/content/images/2022/05/step-5-3-pr-check-repository.png)

Write the title and description with these principles:

- Make the title concise and clear about the issue. Include its number, such as `#00`, if applicable.
- Follow the project's description template or published format.
- Without a template, explain the issue, the reproduction environment for bugs, the proposed approach, and before-and-after differences, using screenshots where useful.
- Be polite; avoid wording that feels rude or aggressive.

### 6. Discuss and revise

Core developers or maintainers will review whether the PR improves the project and whether anything is missing or wrong. Discussion can reveal overlooked details or lead to better code implementing the same fix.

Unfortunately, I omitted part of **the bug reproduction environment**, causing confusion for a core developer: **I had left out the Android test results**. Missing details create unnecessary reviewer effort.

![My painful oversight, visible in a core developer's comment. Resolving such mistakes is part of communication too.](/content/images/2022/05/step-6-1-mistake.png)

### 7. Confirm the merge

If accepted and merged into the original repository, the PR shows this welcome message:

![A moment of delight.](/content/images/2022/05/step-7-1-merged.png)

Your code is now part of the project, and your name joins its contributors.

Once the PR is officially closed, follow the prompt to delete the working branch. If you have no more work planned, you can also delete your fork:

![](/content/images/2022/05/step-7-2-closed.png)

## Principles to keep

Contributing is ultimately work between people. Attitude matters as much as quality. These are the principles I set during my first contribution.

### Do not resent an unexpected response

Not every contribution receives an enthusiastic welcome. A carefully prepared PR may be rejected and closed, or remain open and forgotten without review.

**Do not resent your effort being unaccepted or overlooked.** Most projects run on goodwill without much compensation. Many everyday services owe tangible and intangible debts to those people. Contribute humbly, as someone supporting the project.

### Follow the rules

Most projects have contribution rules. Some are written down; others are conventions maintained by developers and maintainers. Learn them before participating. A project may require opening an Issue and receiving maintainer confirmation before submitting a PR.

Some also specify detailed formats for Issues and PRs. Treat these as **rules enabling smooth remote collaboration**, and follow them.

### Always write pull requests carefully

A PR asks that your work be included in the original repository. Contributors therefore have a responsibility to **describe it thoroughly enough to be incorporated smoothly**.

My incomplete reproduction details caused unexpected confusion. A generous developer helped resolve it, but in a busy project such mistakes can impose considerable communication costs. Be careful and courteous when writing PRs.

## Closing

```css
#sge-input {
	...
	width: 100%;
	padding: 0 0.25em 0 0;
	...
}
```

That is the code in [my first open-source pull request](https://github.com/gmfmi/searchinghost-easy/pull/6): just two lines of CSS. Getting them into the original project was far from simple for a newcomer. At every step, I felt overwhelmed by how little I knew. I documented everything because I did not want to repeat the same struggle. Those notes became this article. Beneath its guide format, it is also a reflection on an awkward first experience.

Good intentions alone accomplish nothing. Everything has methods and rules. Open source has its own, helping collective work remain productive. I hope this guide offers a starting point for anyone who wants to understand and follow them, collaborate meaningfully, relieve another user's inconvenience, and improve a project, but does not know where to begin.
