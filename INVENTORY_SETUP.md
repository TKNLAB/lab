# Lab inventory page: one-time setup (about 10 minutes)

The page is `inventory.html`. Until you connect it to a Google Sheet it runs in **preview mode**: it shows the cleaned Nov 2026 inventory, and changes are saved only in your own browser. Connecting it makes it shared and live for the whole lab.

## How it works

```
inventory.html (GitHub Pages)  ⇄  Google Apps Script web app  ⇄  Google Sheet "TKN Lab Inventory"
   anyone can view                 checks the password             Inventory · Log · Deleted tabs
   edits need the password         (stored only on Google)
```

GitHub Pages can only serve fixed files, so the shared data lives in a Google Sheet that the lab owns. The page checks for other people's changes every 8 seconds.

## Steps

1. **Make the sheet.** Use the lab's Google account if it has one, otherwise yours. Go to sheets.new and name the sheet `TKN Lab Inventory`.
2. **Add the script.** In the sheet, open **Extensions → Apps Script**. Delete the sample code, then paste in all of `tools/inventory-apps-script.gs`.
3. **Set the password.** At the top of the script, change `const SETUP_PASSWORD = '';` to `const SETUP_PASSWORD = 'tkn27';` and click 💾 Save.
4. **Run setup.** In the toolbar's function menu choose `setup`, then click **Run**. Google will ask for permission: choose your account → *Advanced* → *Go to project (unsafe)* → *Allow*. Google shows this warning for every script that is your own and hasn't been published; it isn't a real problem. After setup runs, the sheet has three tabs: **Inventory**, **Log** and **Deleted**.
5. **Clear the password from the code.** Change it back to `SETUP_PASSWORD = ''` and save. The password is now kept in *Project Settings → Script properties → PASSWORD*. That is also where you change it later.
6. **Deploy.** Click **Deploy → New deployment**, then the ⚙ icon → **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Click **Deploy** and copy the **Web app URL** (it ends in `/exec`).
7. **Connect the page.** In `inventory.html`, near the top, paste that URL into `API_URL: ''`. Commit and push to GitHub.
8. **Load the starting list.** Open `https://tknlab.github.io/lab/inventory.html`. The page says the inventory is empty. Click **Load starting inventory**, enter your name and the password, and the 440 cleaned items go into the sheet.

You're done. Share the link with the lab.

## Daily use

1. **Find it.** Type in the search box (name, catalogue no., brand, place or lot), or tap a category.
2. **Update it.** Tap **−** when you finish one and **+** when stock arrives, or tap the number itself to type a new count. The first time, the page asks for your name and the lab password, then remembers this device.
3. **That's it.** The change is saved and appears for everyone within a few seconds.

Other things you can do:
- **Tap an item** to see or change its details, such as where it's kept, its expiry, or notes. Brand, catalogue no., lot and hazard are under *More details*.
- **Add something new** with **＋ Add item** (on a phone, the round ＋ button). Only the name is required. You'll get a warning if it's already listed.
- **Filter chips** (Out of stock, Running low, Expiring soon, Expired, Needs check) narrow the list with one tap.
- **🕑** shows recent changes. **⬇** downloads Excel with one sheet each for Reagents, Antibodies and Glass-Plasticware, plus a *Needs attention* reorder list and the change log.
- **Delete** needs a second tap and can be undone. Deleted rows are also copied to the *Deleted* tab of the sheet.

## Notes

- **Password.** The page never contains the password. Google's server checks it, and wrong guesses are slowed down. Still, `tkn27` is short, so treat it as a lab-door key, not real security. To change it, edit Script properties → PASSWORD. No redeploy is needed.
- **Who can view.** By default anyone with the link can view, and the page is hidden from search engines. To require the password for viewing too, set `LOCK_VIEW = true` in the script and redeploy. Also delete `data/inventory-seed.js` from the repo after the import, because that file contains the starting list.
- **After editing the script,** use **Deploy → Manage deployments → ✏ Edit → Version: New version → Deploy**. This keeps the same URL. Creating a *new deployment* changes the URL.
- **Editing the sheet by hand** is fine, as long as you keep the header row and the ID column. The page picks up changes within a few seconds.
- **Items marked "Needs check"** are rows whose count was blank, or whose label was unclear or cut off in the photo inventory, or that came only from the *old inventory list*. Fix them during the next physical check, then untick *Needs checking*.
