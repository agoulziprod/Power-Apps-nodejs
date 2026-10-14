import { ConfidentialClientApplication } from "@azure/msal-node";

const msal = new ConfidentialClientApplication({
  auth: {
    clientId: process.env.CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.TENANT_ID}`,
    clientSecret: process.env.CLIENT_SECRET,
  },
});
const { accessToken } = await msal.acquireTokenByClientCredential({
  scopes: [`${process.env.D365_URL}/.default`],
});
const base = `${process.env.D365_URL}/api/data/v9.2`;
const headers = {
  Authorization: `Bearer ${accessToken}`,
  "Content-Type": "application/json",
  Accept: "application/json",
  Prefer: 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"',
};

const email = "jane@example.com";
const externalRef = "WEB-1042";

async function upsert(path, body) {
  const res = await fetch(`${base}/${path}`, { method: "PATCH", headers, body: JSON.stringify(body) });
  // 201 = created, 204 = updated
  console.log("PATCH", path, "->", res.status, res.ok ? "" : JSON.stringify(await res.json()));
}

for (let i = 1; i <= 2; i++) {
  console.log(`--- run ${i}`);
  await upsert(`poc_customers(poc_email='${email}')`, { poc_name: "Jane Doe" });
  await upsert(`poc_tickets(poc_externalref='${externalRef}')`, {
    poc_ticketnumber: externalRef,
    poc_subject: "Cannot log in",
    poc_description: "Password reset email never arrives.",
    poc_status: 0,
    poc_priority: 1,
    "poc_Customer@odata.bind": `/poc_customers(poc_email='${email}')`,
  });
}

const res = await fetch(
  `${base}/poc_tickets?$select=poc_ticketnumber,poc_externalref,poc_subject,poc_status` +
    `&$expand=poc_Customer($select=poc_email,poc_name)`,
  { headers }
);
console.log(res.status, JSON.stringify((await res.json()).value, null, 2));