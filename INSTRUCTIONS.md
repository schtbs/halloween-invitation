# Setting up the invitation page

Two pieces: the page lives on **GitHub Pages**, the replies land in a **Google Sheet**. Both are free and need no server. Allow about 20 minutes.

---

## Part 1 – The sheet that keeps the replies

1. Open [sheets.new](https://sheets.new) and name the spreadsheet something like "Halloween replies".
2. Menu **Extensions → Apps Script**. An editor opens with a file called `Code.gs`.
3. Delete what is there and paste in everything from **`code.gs`**.
4. Change the pass phrase at the top:
   ```js
   const PASS_PHRASE = 'ChangeMe2026';
   ```
   This is your key to the host view. It stays inside the script and never appears in the source of the website, so guests cannot read it.
5. Save (the disk icon).
6. Top right: **Deploy → New deployment**. Click the gear, choose **Web app**, then set:
   - *Execute as:* **Me**
   - *Who has access:* **Anyone** ← essential, otherwise your guests' replies never arrive
7. Click **Deploy** and grant access to your Google account. On the "Google hasn't verified this app" warning, choose *Advanced → Go to …*; it is your own script.
8. You receive a **web app URL** shaped like `https://script.google.com/macros/s/AKfy…/exec`. Copy it.

> When you edit the script later: **Deploy → Manage deployments → Edit → Version: New**, otherwise the old version keeps running.

---

## Part 2 – The page on GitHub

1. On [github.com](https://github.com) create a new repository, for example `halloween`, set to **Public** (Pages is only free on public repos).
2. **Add file → Upload files**, upload `index.html`, then commit.
3. In the repository go to **Settings → Pages**. Under *Source* pick **Deploy from a branch**, branch `main`, folder `/ (root)`, and save.
4. A minute or two later the page is live at
   `https://YOURNAME.github.io/halloween/`

---

## Part 3 – Connecting the two

1. Open `index.html` in the repository and click the pencil.
2. At the very top sits the block `var CONFIG = { … }`. Fill in your party: title, the line of introduction, date, dress code and the rest.
3. Put the web app URL from Part 1 into `apiUrl`:
   ```js
   apiUrl: "https://script.google.com/macros/s/AKfy…/exec"
   ```
4. **Commit changes.** About a minute later it is live.

From then on the red notice disappears, and the counter reads its number from the sheet and refreshes every minute.

---

## Part 4 – The guest list (who may reply)

The script only accepts replies from people you invited. It checks the name against a second tab in the same spreadsheet.

1. In your spreadsheet add a tab named exactly **`Guests`**.
2. Row 1 holds the headers `name` and `code`. From row 2 downwards, one invited person per row:

   | name | code |
   |---|---|
   | Anna Berger | |
   | Jonas Weiss | |
   | Lena Fischer | raven |

3. The `code` column is optional. Leave it empty and the name alone is enough. Fill it in and that person must also type their code — useful if you want to be strict about a particular guest.
4. If you use codes for everyone, set `askForCode: true` in `index.html` so the code field appears on the page, and send each guest their code with the invitation.

**How the matching works.** Upper and lower case, extra spaces, accents and ß are ignored: `Anna-Lena Müßig`, `anna lena mussig` and `ANNA LENA MUSSIG` all find the same row. Someone who is not on the list gets a clear message and nothing is written.

**One row per invited person.** The reply is filed under the guest list entry, not the device. So a guest can answer on their phone and change their mind later on a laptop — the same row is updated instead of a second one appearing.

**Turning it off:** set `REQUIRE_INVITATION = false` at the top of the script, and anyone with the link may reply again.

In the host view you now also see **Still to reply** — everyone on the guest list who has not answered yet. Handy for the reminder round.

---

## Using it

**Guests** just get the link. They see the details, the count and the reply form. They never see other guests' names.

**You** tap *Host view* at the bottom, enter your pass phrase, and get every name, every allergy and a summary for the shopping list. The same data sits in your Google Sheet at any time.

**Changing the party** happens in the `CONFIG` block on GitHub — every commit updates the page.

---

## When something goes wrong

There is a **Diagnostics** button at the bottom of the page. It shows whether the connection stands and what the last error was.

| Symptom | Cause |
|---|---|
| Red notice "Preview without a spreadsheet" | `apiUrl` is still empty |
| "Could not be sent: Server replied 401/403" | The deployment is not set to *Who has access: Anyone* |
| Counter stays at 0 although replies are in the sheet | No new version deployed after editing the script |
| "That pass phrase is not right" | The phrase in the script differs — mind upper and lower case |
| "We cannot find that name on the guest list" | The name is missing from the `Guests` tab, or the tab is named differently |
| "That invitation code does not match" | The `code` cell for that guest holds something else |

## Worth knowing

The page is publicly reachable: anyone with the link can sign the register, there is no password for guests. For a party among friends that is normal. Names and allergies are protected though — they live only in your sheet and can only be fetched with the pass phrase.

With the guest list switched on, strangers can no longer add fake entries. Be aware of the flip side: anyone who knows an invited person's name could reply in their place. Personal codes close that gap if it matters to you.
