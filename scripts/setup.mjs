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
};

const label = (text) => ({
  "@odata.type": "Microsoft.Dynamics.CRM.Label",
  LocalizedLabels: [
    { "@odata.type": "Microsoft.Dynamics.CRM.LocalizedLabel", Label: text, LanguageCode: 1033 },
  ],
});

async function createKey(table, schemaName, displayName, column) {
  const res = await fetch(`${base}/EntityDefinitions(LogicalName='${table}')/Keys`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      SchemaName: schemaName,
      DisplayName: label(displayName),
      KeyAttributes: [column],
    }),
  });
  console.log(table, column, "->", res.status, res.ok ? "created" : (await res.json()).error?.message);
}

await createKey("poc_ticket", "poc_ExternalRefKey", "External Ref Key", "poc_externalref");
await createKey("poc_customer", "poc_EmailKey", "Email Key", "poc_email");

for (const col of ["poc_status", "poc_priority"]) {
  const res = await fetch(
    `${base}/EntityDefinitions(LogicalName='poc_ticket')/Attributes(LogicalName='${col}')` +
      `/Microsoft.Dynamics.CRM.PicklistAttributeMetadata?$select=LogicalName&$expand=OptionSet($select=Options)`,
    { headers }
  );
  const d = await res.json();
  console.log(col, d.OptionSet?.Options?.map((o) => `${o.Value} = ${o.Label.UserLocalizedLabel.Label}`));
}