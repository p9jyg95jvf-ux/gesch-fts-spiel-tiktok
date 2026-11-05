# Lesson 6: Posting, the vote, and the next episode

**Goal:** post the episode so new people find it, collect the vote, and turn the result into the next episode.

## What Claude hands you

After approval 3, Claude renders the full-size final and gives you:
- **the video:** the file ending in `_final.mp4` in your episode's `out` folder (for example
  `my-series_ep01_final.mp4`) is the one to upload; the one ending in `_phone.mp4` is a smaller copy that's easy to send
  to your phone;
- **3 cover options** to pick from;
- **`publish/POST.md`:** the YouTube title and description, the Instagram caption and poll, the pinned vote comment, a
  pinned clue comment and its hint, a Story idea, and a posting checklist.

**Claude never posts for you.** Posting, replying and anything that needs your accounts is yours.

## The cover

- **Ask for the PART number to be the biggest thing on it.** By default the cover tool writes the series and episode
  small at the top (you can see it on the Day 23 example covers), so say: "Make PART 3 the cover title, the biggest text
  on the cover." On Day 23 the part number started out small, and on the profile grid nobody could tell which episode
  was which. The series name can be small; "PART 3" can't.
- **No spoilers:** the situation, never the twist, never the answer, never the vote numbers.
- **The same style every episode**, so your profile grid reads as one series.
- Everything important inside the middle of the image (Claude checks the grid crop for you).

## Posting, in order

1. **YouTube Short first**, about an hour before Instagram. Use the title and description from POST.md (the
   description links every earlier episode in order). Wait for "Checks complete" before you publish.
2. **Instagram Reel:** the caption, **the poll** (it pulls far more votes than comments, so always add it), the cover.
   Link this reel from the previous episode, and link back to episode 1.
3. **Pin the vote comment** on both. Keep the vote open at least 24 hours, including a full daytime in the country
   most of your viewers are in.
4. **Pin the clue comment on Instagram** ("There's something hidden at 0:21 👀"): Instagram lets you pin up to 3
   comments. YouTube pins only one, so keep the vote comment pinned there and post the clue as a normal comment. If
   nobody finds it in about 12 hours, post the hint.
5. **A Story** sharing the reel, with a poll sticker and no spoilers.
6. **Reply** to 10-15 good comments in the first hour, then a few each day. Never confirm a theory: pin a great guess
   with "We're not saying anything 👀".

The Instagram caption asks the story question in words, with no numbers: the numbers belong in the video and the
pinned vote comment. Never "comment 1 to unlock part 2".

## Test your hooks with trial reels

Instagram's trial reels are shown to people who don't follow you, before (or instead of) your followers. You need a
professional (Creator or Business) Instagram account to post them. They're a cheap way to test an opening: post the
same episode with a different cover line, or ask Claude for a version with a different first picture, as a trial, and
compare how many people kept watching. (Changing the first spoken words means new takes and re-timed shots, so test
pictures and cover lines, not words.) On one of our series, a trial version of part 1 got 280K views of its own, on top
of the main post (our numbers, not a forecast). Keep the version that holds people, and use what you learn in the next
episode. If a trial copy shows the vote, count its comments too.

## Counting the vote

After about 24 hours, collect the vote: the Instagram poll result, and how many comments said 1, 2 or 3 on Instagram
and on YouTube. Give Claude the raw numbers and it does the maths, for example:

> Episode 1's vote: the poll says 1: 371, 2: 192, 3: 77. Comments: 1: 49, 2: 25, 3: 11.

Claude then:
1. updates `series/CANON.md` with what episode 1 actually showed and said;
2. makes the next episode and writes the result into its `stats.json`;
3. writes the next script starting from the winning option.

**Credit the vote early.** The next episode opens on the winning choice, with a "YOUR VOTE" card by about 4 seconds.
People who voted come back to see their choice happen. On one of our series, part 2 got 68% as many views as part 1;
30-50% is more usual. Keep a vote in every part and credit it every time. Your own numbers will differ.

**In a hurry?** If you need to start the next episode before the vote closes, and one option is clearly ahead, ask
Claude to put in placeholder percentages. When the vote closes, tell Claude the real numbers. It puts them on the vote
card and re-makes the video around the same pictures: only the words on screen change, not the shots. Keep numbers out
of the spoken credit ("Most of you said: follow the prints"), so the voice doesn't change either.

## Recaps for newcomers

Once you have a few episodes, new viewers arrive in the middle. A recap helps them catch up:
- It's a **separate post**, never the start of a new episode (an episode always opens on action).
- It tells **the full story so far, with every vote and its result.** A 30-second teaser was "too thin" on one of our
  series; a full recap can run up to 3 minutes.
- A **"STORY SO FAR"** tag stays on screen the whole way, so nobody mistakes it for a new part.

Recaps aren't a built-in step in this version (they're planned for a later one). If you want one now, Claude can join
your posted finals into one video by hand, but the STORY SO FAR tag and the trims are custom work, so expect a few
rounds of notes.

## Don't

- Buy followers or likes, join engagement groups, or use auto-DM tools.
- Promise a posting time you might miss. If you're late, post one Story with the new time.
- Ask fans for real names, ages, photos or locations.
- Use anyone else's characters, music, logos or footage.

That's the loop: **idea → script → voice and look → draft → post → vote → next episode.** Each episode reuses the
kit you've built, so each one gets quicker to make.

**Your next episode** starts again at [Lesson 3: Directing the script](03-directing-the-script.md), with the same three
approvals.
