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

const res = await fetch(`${process.env.D365_URL}/api/data/v9.2/WhoAmI`, {
  headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
});
console.log(res.status, await res.json());