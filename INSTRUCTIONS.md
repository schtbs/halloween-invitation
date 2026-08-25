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

## Worth knowing

The page is publicly reachable: anyone with the link can sign the register, there is no password for guests. For a party among friends that is normal. Names and allergies are protected though — they live only in your sheet and can only be fetched with the pass phrase.
