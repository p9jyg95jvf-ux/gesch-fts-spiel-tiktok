# Install the Arc Lab Series Skill (about 10 minutes)

## What you need
- **Claude Code with a paid Claude plan (Pro or Max) or a pay-as-you-go Claude API key** (with a key, use the `claude`
  terminal app, and the first time pick the sign-in for API usage billing; with a plan, the desktop app's Code tab
  works too).
- **Windows 10/11 or macOS 13 (Ventura) or newer**, about 2 GB of free disk space, any modern CPU (more cores = faster renders).
- **An ElevenLabs account** for the voices (a paid plan if you'll publish commercially). Your key stays on your computer.
- No GPU needed. No AI video anywhere: every picture is drawn in code.

## 1. Put the skill where Claude Code finds it
`SKILL.md` must sit directly inside a folder named `arc-lab-series` in your skills folder:
- **Windows:** `C:\Users\<you>\.claude\skills\arc-lab-series\SKILL.md`
- **Mac:** `~/.claude/skills/arc-lab-series/SKILL.md`

(Or inside one project only: `<project>/.claude/skills/arc-lab-series/`.) Exactly one `arc-lab-series` level:
unzipping often adds an extra folder (`skills/arc-lab-series-v1.0.2/arc-lab-series/SKILL.md`), and then Claude Code
can't find the skill.

**The easiest way: let Claude put it in place.** Download the zip, open Claude Code anywhere and type:

> Unzip the newest arc-lab-series zip from my Downloads into my Claude skills folder (replacing any old
> arc-lab-series folder), so the file ends up at .claude/skills/arc-lab-series/SKILL.md in my home folder.

**By hand, from the zip:**
- **Windows:** right-click the zip → **Extract All…** → in the box "Files will be extracted to this folder", replace the
  whole suggested path (it ends in the zip's own name) with `%USERPROFILE%\.claude\skills` → **Extract**.
- **Mac:** double-click the zip in Downloads; it makes an `arc-lab-series` folder next to it. In Finder choose
  **Go → Go to Folder…**, type `~/.claude`, open (or make) the `skills` folder, and drag `arc-lab-series` into it.

**From GitHub (best for updates).** Accept the repo invite in your email. You need `git` (Windows: Git for Windows from
git-scm.com; Mac: it offers to install itself the first time you type `git`). Then:
- **Windows (PowerShell):** `git clone https://github.com/arclab-studio/series-skill "$HOME\.claude\skills\arc-lab-series"`
- **Mac (Terminal):** `git clone https://github.com/arclab-studio/series-skill ~/.claude/skills/arc-lab-series`

The repo is private, so GitHub asks you to sign in the first time. If that gets fiddly, ask Claude: "clone
arclab-studio/series-skill into my Claude skills folder as arc-lab-series, and help me sign in to GitHub".

**Updates:** ask Claude to "update the Arc Lab skill" (with GitHub that's a `git pull`). With the zip, download the new
one from your order page and replace the `arc-lab-series` folder (Windows: if it asks, choose "Replace the files in the
destination"): your series live in their own folders, so nothing of yours is lost. Then start a new Claude Code session
and ask Claude to "run the Arc Lab setup check": it reinstalls the drawing library, which replacing the folder can
remove.

**Then start a new Claude Code session** (a new chat, or close and reopen the app) so it sees the skill.

## 2. Let Claude finish the setup
Open Claude Code in the folder where you want your series to live and type:

> set up the Arc Lab series skill

Claude runs the setup doctor, tells you what's missing, and (with your OK) installs it. That's it. If you prefer to do
it by hand, the doctor lists exactly these:

| Needs | Windows | Mac |
|---|---|---|
| Node.js 18+ | install the LTS from nodejs.org | `brew install node` |
| Python 3.10+ | python.org (tick "Add python.exe to PATH") | the installer from python.org |
| ffmpeg | `winget install Gyan.FFmpeg` | `brew install ffmpeg` |
| the drawing library | in the skill's `engine` folder: `npm install` | same |
| Python packages | `python -m pip install -r "$HOME\.claude\skills\arc-lab-series\engine\requirements.txt"` | `python3 -m pip install -r ~/.claude/skills/arc-lab-series/engine/requirements.txt` |

Mac by hand: the `brew` commands need Homebrew first (brew.sh); or install Node from nodejs.org instead.

Then check that it ends with **"ready to make episodes"**:
- **Windows (PowerShell):** `python "$HOME\.claude\skills\arc-lab-series\engine\arclab.py" doctor`
- **Mac (Terminal):** `python3 ~/.claude/skills/arc-lab-series/engine/arclab.py doctor`

## 3. Your ElevenLabs key
When Claude makes your series folder, it has a `.env.example` file. Ask Claude: "make my .env file from .env.example and
open it so I can paste my key". Paste your key right after `ELEVENLABS_API_KEY=` (elevenlabs.io → your profile → API
keys), then save and close. On a Mac, don't do this in Finder: it hides files whose names start with a dot. The skill
only sends the key to ElevenLabs to make your voices; it never prints it or shares it anywhere else.

## 4. Make something
New to it? Read the lessons first: six short guides, one per step, from this install to posting. They're in the
skill's `lessons` folder (Windows: `%USERPROFILE%\.claude\skills\arc-lab-series\lessons`; Mac: Finder → Go → Go to
Folder… → `~/.claude/skills/arc-lab-series/lessons`), or ask Claude: "show me Arc Lab lesson 1".

> Make me a series: a kid and their robot run a night-shift repair shop, and viewers vote each episode.

Claude writes the series bible and the first episode's script and stops for your OK (approval 1), records the voices,
shows you the characters and sets (approval 2), builds and checks the episode, sends you a draft (approval 3), then
renders the final and writes your publishing pack. You post it; the votes decide the next episode.

## Troubleshooting
- Ask Claude to "run the Arc Lab setup check", or run the doctor yourself (the commands above; add
  `--ep <your series folder>` to also check the key and the engine link). It also spots a skill folder unzipped one
  level too deep.
- Claude doesn't seem to know the skill? Check the file is at `.claude/skills/arc-lab-series/SKILL.md` in your home
  folder (not one folder deeper), then start a new Claude Code session.
- Moved the skill folder? Ask Claude to re-link your series (`doctor --ep <series> --fix-engine`).
- A render feels slow: Claude can lower the number of parallel workers (`--procs 4`) so your computer stays usable.
- Still stuck? The setup guide is at https://arclabstudios.com/start.html; ask in #help on our Discord (the button is
  on your order page) or email contact@arclabstudios.com.
