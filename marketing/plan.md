# Best Friend Stock: marketing plan (first month)

Written 2026-11-27. Goal: more students use the site. Everything below is aimed at one audience: students of IB, A-Level, AP
and IGCSE economics, and teenagers curious about investing.

## 1. Where we start (real numbers, from the site's own statistics)

- About 330 visits a week, 1,105 devices in total. Most visits are "direct" (friends, links people were sent).
- Instagram is the only channel that works so far (about 36 visits). Google sent 7. TikTok: nothing yet.
- The features people use: market analysis (1,192 uses), paper trading (267), study centre (181). The newer ones are barely
  used: diagram lab 24, classes 12, case library 10, time machine 7, Fed game 7. They are good and almost nobody knows.

So the job is not "make the site better". It is to get the best parts in front of the right students, again and again.

## 2. What we say (positioning)

"Free tools made by students, for students: learn economics from real news, practise investing with virtual money."

Three promises we can keep, each tied to something that exists:
1. A new real-news economics example every day, with a practice question (the case library).
2. Drag the curve, see the diagram redraw (the diagram lab).
3. Trade through 2008 or 2020 with only the information people had then (the time machine), and be the Fed chair (the Fed game).

Never: promise returns, tell anyone what to buy, say we "beat the market", or post anything about elections or violence.
The site is for learning, not advice; every post that mentions investing says so in one short line.

## 3. Channels

- Instagram (main): 4 to 5 posts a week. Carousels for the daily case, charts and screenshots of the site for the rest. No one on camera.
- TikTok (second): the same material as short videos or slideshows, posted a day later. Do not spend extra time here until
  Instagram is steady.
- Teachers (the multiplier): one economics teacher who uses the class tool brings 20 to 30 students. See section 7.

## 4. The weekly rhythm

| Day | Post | Made by |
|---|---|---|
| Mon | Case of the day (4-slide carousel) | generated: `tools/social/case_cards.mjs` |
| Tue | (optional) another case of the day | generated |
| Wed | History Time Machine question with real figures, plus a story poll | `tools/social/week1.mjs` |
| Thu | (optional) another case of the day | generated |
| Fri | "Draw it": the diagram lab before and after a shock | `tools/social/week1.mjs` |
| Sat | (optional) paper-trading class shout-out, only with the students' permission | I write it |
| Sun | Exam technique carousel, e.g. "Evaluate in three moves" | `tools/social/week1.mjs` |

The account is the brand, "Best Friend Stock", and nobody appears on camera (decided 2026-11-27). Every post is cards, charts and
screenshots of the site itself. The first four posts are in `~/Documents/BFS-marketing/week-1/`.

## 5. Hook bank (first lines that make people stop)

- "This news story is your next economics essay."
- "Could you have survived 2008 as a trader? You only get the information people had that day."
- "You are the Fed chair. Inflation is 9%. What do you do?"
- "We built a free economics tool. Here is the diagram everyone gets wrong." (then supply shift vs movement along the curve)
- "Stop memorising evaluation. Use these three moves."
- "A paper-trading account with $100,000. Here is what a beginner usually does wrong in week one." (educational, no advice)

## 6. Measuring (no guessing)

The site already records where visits come from. Use a different tag on each link so we can see what works:
- Instagram bio: `?utm_source=ig_bio` (already in use)
- Instagram post captions: `?utm_source=ig_post`
- TikTok bio: `?utm_source=tt_bio`
- Teacher emails and class links: `?utm_source=teacher`

Every Friday look at the "sources" part of https://bestfriendstock.com/api/analytics/stats and note which tag grew. Keep what
grows, drop what does not, after at least three weeks of the same kind of post.

## 7. Teachers (the biggest lever)

A short message to an economics teacher you know, or to a school's economics department:

> Hi Ms/Mr ___, I'm a student at ___ and built a free tool for economics classes: every day it turns a real news story into an
> essay example with an exam-style question, and you can set students paper-trading and "history time machine" tasks that mark
> themselves. You can see the whole class's progress. It's free and needs no sign-up for students: bestfriendstock.com/class
> Would you like me to set up a test class for you?

Send five this month. One teacher using it is worth more than a hundred posts.

## 8. What I do, what you do

I write: captions, scripts, the weekly calendar, teacher messages, and the daily case cards (run the generator, I check the output).
You do: read every card before it goes out, and press "Post".
I do not log in to your accounts or post for you; both apps restrict automated posting and an account that looks automated can lose reach or be limited.

## 9. Decided, and still open

Decided (2026-11-27): the account is "Best Friend Stock" (the brand) and no one appears on camera.
Still open: the Instagram handle, whether a TikTok exists, and how many posts a week you can keep up (the plan assumes 4).
