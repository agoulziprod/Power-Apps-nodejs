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
const headers = { Authorization: `Bearer ${accessToken}` };
const base = `${process.env.D365_URL}/api/data/v9.2`;

async function get(path) {
  const res = await fetch(`${base}/${path}`, { headers });
  const body = await res.json();
  if (!res.ok) console.log("ERROR", res.status, path, body.error?.message);
  return body;
}

for (const table of ["poc_ticket", "poc_customer"]) {
  const e = `EntityDefinitions(LogicalName='${table}')`;
  const def = await get(`${e}?$select=EntitySetName,PrimaryNameAttribute,PrimaryIdAttribute`);
  const attrs = await get(`${e}/Attributes?$select=LogicalName,AttributeType`);
  const keys = await get(`${e}/Keys?$select=LogicalName,KeyAttributes,EntityKeyIndexStatus`);
  const rels = await get(
    `${e}/ManyToOneRelationships?$select=ReferencingAttribute,ReferencedEntity,ReferencingEntityNavigationPropertyName`
  );

  console.log("\n==", table);
  console.log("entitySet:", def.EntitySetName, "| primaryName:", def.PrimaryNameAttribute, "| id:", def.PrimaryIdAttribute);
  console.log("custom columns:", attrs.value?.filter((a) => a.LogicalName.startsWith("poc_")).map((a) => `${a.LogicalName} (${a.AttributeType})`));
  console.log("keys:", JSON.stringify(keys.value));
  console.log("lookups:", JSON.stringify(rels.value?.filter((r) => r.ReferencingAttribute.startsWith("poc_"))));
}