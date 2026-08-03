## 📊 Google Sheets Setup Guide

This app uses a Google Sheet as a database and backend API via **Google Apps Script**.

### 1. Create the Spreadsheet
1. Create a new [Google Sheet](https://sheets.google.com).
2. Rename the default tab to **`Expenses`**.
3. Add the following headers in **Row 1**:
   * **Column A:** `Timestamp`
   * **Column B:** `Amount`
   * **Column C:** `Category`
   * **Column D:** `Note`

---

### 2. Add the Apps Script Code
1. In your Google Sheet, open **Extensions > Apps Script**.
2. Replace all existing code in `Code.gs` with the project's Apps Script code.
3. Click **Save** (💾 icon).

---

### 3. Deploy as a Web App (API Endpoint)
1. Click **Deploy > New deployment** in the top right.
2. Click the gear icon next to *Select type* and select **Web app**.
3. Configure the settings:
   * **Description:** `Expense Tracker API`
   * **Execute as:** `Me`
   * **Who has access:** `Anyone` *(Required so the web form can submit entries without requiring individual authentication)*
4. Click **Deploy** and grant the required permissions when prompted.
5. Copy the generated **Web App URL** (it should end in `/exec`).

---