# Lesson 1: Install and check

**Goal:** the skill is in the right folder, Claude Code can see it, and the setup check (the "doctor") ends with
**"ready to make episodes"**. Plan on about 10 minutes, plus downloads.

## What you need

- Claude Code with a paid Claude plan (Pro or Max) or a pay-as-you-go Claude API key (with a key, use the `claude`
  terminal app). With a plan, the desktop app's Code tab works too.
- An ElevenLabs account for the voices. A paid plan if you'll publish commercially.
- Windows 10/11 or macOS 13 (Ventura) or newer, about 2 GB of free disk space. No graphics card needed: every picture
  is drawn in code.

## 1. Put the skill in place

Claude Code only finds a skill when its `SKILL.md` sits exactly here, in your home folder:

```
.claude/skills/arc-lab-series/SKILL.md
```

The usual mistake is one folder too many. Unzipping often makes `arc-lab-series-v1.0.2/arc-lab-series/SKILL.md`,
and then Claude can't see the skill at all.

The easiest way is to let Claude do it. Open Claude Code anywhere and say:

> Unzip the newest arc-lab-series zip from my Downloads into my Claude skills folder (replacing any old
> arc-lab-series folder), so the file ends up at .claude/skills/arc-lab-series/SKILL.md in my home folder.

If you prefer to do it by hand, or want the GitHub copy (best for updates), `INSTALL.md` has the steps for Windows and
Mac.

**Then start a new Claude Code session.** A skill is only noticed when a session starts.

## 2. Let Claude set it up

Make an empty folder for your series (for example `Documents/My Series`) and open Claude Code in it:
- **In the desktop app:** start a new session in the Code tab and pick that folder.
- **In the terminal:** type `cd ` (with a space after it), drag the folder onto the terminal window, press Enter, then
  type `claude`.

Then say:

> set up the Arc Lab series skill

Claude runs the doctor. It lists every tool the skill needs, each with **OK** or **FIX**:

```
  OK   Node.js v22.18.0 (need 18+)
  FIX  ffmpeg + ffprobe on PATH
        -> Windows: `winget install Gyan.FFmpeg`; Mac: `brew install ffmpeg`; then reopen the terminal
  ...
11 OK, 1 to fix
```

For every **FIX**, Claude tells you what it wants to install and asks first. Say yes, and it installs it and runs the
doctor again. You are done when the last line says **"ready to make episodes"**.

If something still shows FIX right after it was installed, close Claude Code completely, open it again in the same
folder and say "run the Arc Lab setup check": a new program is only seen after a restart. On a Mac, Claude may first
ask you to install Homebrew (the Mac's free installer for these tools). It gives you one line to paste into Terminal,
and you type your Mac password when asked (nothing shows while you type; that's normal). Then Claude carries on.

A **NOTE** line is advice, not an error. The common one says the skill folder is outside your skills folder: go back
to step 1.

## 3. Your ElevenLabs key

Claude makes your series folder: a new folder named after your series, inside the empty folder from step 2 (for
example `Documents/My Series/night-shift-repair-shop`). It does this during setup or when you give your first idea
(lesson 2), and then asks for your key. The file `.env.example` is in that new folder.

1. Ask Claude: "make my .env file from .env.example and open it so I can paste my key". Claude copies the file and
   opens it in Notepad (Windows) or TextEdit (Mac).
2. Paste your key right after `ELEVENLABS_API_KEY=`, then save and close. You find the key at elevenlabs.io → your
   profile → API keys. When you create the key, leave it unrestricted. If you do restrict it, allow Text to Speech,
   Speech to Text and Voices (read).

(On a Mac, don't try this in Finder: it hides files whose names start with a dot and won't let you make one.)

The skill reads the key from that file and only sends it to ElevenLabs to make your voices. It never prints it or
shares it anywhere else. Don't post it anywhere, and don't put it in a screenshot.

Then ask Claude to "run the Arc Lab setup check for my series". It checks the key and the link to the engine too.

## 4. Check it yourself (optional)

Claude runs the doctor for you, but you can run it any time:

- **Windows (PowerShell):** `python "$HOME\.claude\skills\arc-lab-series\engine\arclab.py" doctor`
- **Mac (Terminal):** `python3 ~/.claude/skills/arc-lab-series/engine/arclab.py doctor`

## When something goes wrong

| What you see | What to do |
|---|---|
| Claude doesn't seem to know the skill | Check the folder (step 1), then start a new session. |
| `python` isn't found (Windows) | Install Python from python.org and tick "Add python.exe to PATH". Close and reopen the terminal. |
| `python` isn't found (Mac) | Use `python3`. |
| You moved the skill folder and a series stopped working | Ask Claude to "re-link my series to the Arc Lab engine". |
| Your computer feels slow while it renders | Ask Claude to "use fewer workers". |

## Updates

Every v1 update is free. Say **"update the Arc Lab skill"**:
- If you installed from GitHub, Claude pulls the new version.
- If you used the zip, download the new zip from your order page and replace the `arc-lab-series` folder (on Windows,
  if it asks, choose "Replace the files in the destination"). Then start a new Claude Code session and ask Claude to
  "run the Arc Lab setup check": replacing the folder can remove the drawing library, and Claude reinstalls it (with
  your OK).

Your series live in their own folders, so an update never touches them.

## Still stuck?

The setup guide is at https://arclabstudios.com/start.html. Ask in **#help** on our Discord (the button is on your
order page), or email contact@arclabstudios.com. Send the doctor's output with your question: it shows us what's
missing straight away. It never shows your key, but it does show your folder paths, so if your computer user name is
your real name, replace it with "me" before posting.

**Next:** [Lesson 2: Your first idea](02-your-first-idea.md).
