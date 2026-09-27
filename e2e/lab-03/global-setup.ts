import prepareAccounts from "./prepare-accounts";

export default async function globalSetup() {
  await prepareAccounts();
}
