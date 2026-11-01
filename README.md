# my-spending-tracker

Small expense tracker that posts entries to a Google Apps Script endpoint through a server-side proxy.

[How to setup the GoogleSheets](./GOOGLESHEETSGUIDE.md)

## Checking Forecast

Open [Checking Forecast](./forecast.html) from the expense logger. When served over
HTTP or HTTPS, it automatically loads [checking-forecast.json](./checking-forecast.json).
The included file contains fictional sample amounts; replace them with your forecast.

### Publish monthly updates

1. Edit [checking-forecast.json](./checking-forecast.json) locally in VS Code.
2. Update the month, starting balance, cushion, paycheck dates and amounts, and bills.
3. Run `npm test` to validate the committed file and forecast behavior.
4. Commit and push your changes to the branch used for your Vercel production deployment.
5. Once that deployment succeeds, open or reload the Checking Forecast page.

A local commit alone does not update the website. Vercel's Git integration must be
connected and deploy the pushed branch. Each deployment serves its own JSON version;
the page fetches it without browser caching on every load.

**The deployed JSON is public to anyone who can access the site**, even with a private
Git repository. It exposes balances, income, bill amounts, labels, and payment dates.
Do not include account numbers, credentials, or other information you do not want
published. Committed versions remain in Git history and may remain in older deployments.

**Open JSON file** still previews a local file without uploading or publishing it.
Reloading restores the published forecast. **Download template** and **View example
month** use fictional amounts. Opening the HTML directly as a local file also works
for previews, but automatic JSON loading requires an HTTP server or the deployed site.

Use this format (amounts are numeric US dollars with at most two decimals):

```json
{
	"month": "2026-11",
	"startingBalance": 3200,
	"minimumBalance": 500,
	"paychecks": [
		{ "person": "Me", "date": "2026-11-06", "amount": 2400 },
		{ "person": "Husband", "date": "2026-11-13", "amount": 2600 }
	],
	"bills": [
		{ "name": "Mortgage", "date": "2026-11-01", "amount": 1900 },
		{ "name": "HOA", "date": "2026-11-05", "amount": 250 },
		{ "name": "Credit card", "date": "2026-11-18", "amount": 875.42 }
	]
}
```

All dates must be real `YYYY-MM-DD` dates in the selected `month`. Add each paycheck
separately. Copy consistent monthly bills into each month's file, update variable
bills to their expected amounts, and include every-two-month bills only when due.
The page does not generate recurring transactions. Both arrays may be empty.
The starting balance is the balance before any listed transactions on the first day.

Withdrawals are processed before deposits on the same date. Red means a balance
is below your cushion, even when it is above zero; green means the cushion is covered.
Transfer needed is the cushion minus the lowest projected balance, if positive.
Savings headroom is the lowest projected balance minus the cushion, if positive.
Both include the starting balance and intermediate same-day balances, not just
month-end. Editing the cushion on the page recalculates the forecast for this tab
only; update `minimumBalance` in [checking-forecast.json](./checking-forecast.json)
and deploy it to retain that change for everyone.

This is a planning estimate for the entire listed month, not a live bank balance
or an instruction to transfer money today. Include pending payments and other
spending, avoid double-counting purchases paid through a listed credit card bill,
and verify bank posting dates before making transfers.

## Why the proxy exists

The browser posts to `/api/submit-expense` instead of calling Google Apps Script directly. The real `SCRIPT_URL` stays in a server-side environment variable, so it is not committed to GitHub and is not exposed in the page source.

## Deploy on Vercel

1. Import this repository into Vercel.
2. Add an environment variable named `SCRIPT_URL` with your Google Apps Script web app URL.
3. Deploy the project.

Vercel serves `index.html` as the frontend and `api/submit-expense.js` as the serverless proxy.

## Local development

1. Install Vercel CLI with `npm install -g vercel`.
2. Create a file named `.env.local` in the project root.
3. Add your secret:

```env
SCRIPT_URL=https://script.google.com/macros/s/your-app-id/exec
```

4. Run `vercel dev` from the project root.

Do not commit `.env.local`.

## Run tests

1. Make sure you have Node.js 18 or newer installed.
2. Run `npm test` from the project root.

The test suite uses Node's built-in test runner and covers the proxy validation and
forwarding logic, plus forecast JSON validation, cent arithmetic, date ordering,
same-day shortfalls, cushion calculations, and automatic published-file loading
(including invalid files and local-preview request races).


