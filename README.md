# my-spending-tracker

Small expense tracker that posts entries to a Google Apps Script endpoint through a server-side proxy.

[How to setup the GoogleSheets](./GOOGLESHEETSGUIDE.md)

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

The test suite uses Node's built-in test runner and covers the proxy validation and forwarding logic.


