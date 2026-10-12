import prepareAccounts from "./prepare-accounts";
import prepareLab4Fixtures from "../lab-04/prepare-fixtures";

export default async function globalSetup() {
  await prepareAccounts();
  await prepareLab4Fixtures();
}
