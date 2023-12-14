import express, { Application, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";

import {
  deployTokens,
  generateWallet,
  getOwnerWallet,
  getPublicBalances,
  getPrivateBalances,
  shieldBalance,
  unshieldBalance,
  mintPublic,
  mintPrivate,
} from "./modules/aztec";
import { BarretenbergSync } from "@aztec/bb.js";

dotenv.config();

const app: Application = express();
const port = process.env.PORT || 8000;

app.use(express.json());
app.use(cors());

app.get('/ownerWallet', async (req: Request, res: Response) => {
  const address = (await getOwnerWallet()).getAddress().toString();

  res.send({
    address
  });
});

app.post('/deployTokens', async (req: Request, res: Response) => {
  const ownerWallet = await getOwnerWallet();
  await deployTokens(ownerWallet);

  res.send({
    status: true
  });
});

app.post('/generateWallet', async (req: Request, res: Response) => {
  const wallet = await generateWallet();

  res.send(wallet);
});

app.post('/aztecBalances', async (req: Request, res: Response) => {
  console.log(`POST to /aztecBalances with ${JSON.stringify(req.body)}`);
  const publicBalances = await getPublicBalances(req.body.walletId);
  const privateBalances = await getPrivateBalances(req.body.walletId);

  res.send({
    public: publicBalances,
    private: privateBalances
  });
});

app.post('/publicBalances', async (req: Request, res: Response) => {
  const balances = await getPublicBalances(req.body.walletId);

  res.send(balances);
});

app.post('/privateBalances', async (req: Request, res: Response) => {
  const balances = await getPrivateBalances(req.body.walletId);

  res.send(balances);
});

app.get('/bridgeBalances', async (req: Request, res: Response) => {
  // const balances = await getPrivateBalances(req.body.walletId);
  //
  // TODO: endpoint!
  res.send({
    WMATIC: "0",
    USDT: "0"
  });
});


app.post('/mintPublic', async (req: Request, res: Response) => {
  const status = await mintPublic(req.body.token, req.body.amount, req.body.walletId);

  res.send(status);
});

app.post('/mintPrivate', async (req: Request, res: Response) => {
  const status = await mintPrivate(req.body.token, req.body.amount, req.body.walletId);

  res.send(status);
});

app.post('/shieldBalance', async (req: Request, res: Response) => {
  const balances = await shieldBalance(req.body.token, req.body.amount, req.body.walletId);

  res.send(balances);
});

app.post('/unshieldBalance', async (req: Request, res: Response) => {
  const balances = await unshieldBalance(req.body.token, req.body.amount, req.body.walletId);

  res.send(balances);
});

app.listen(port, async () => {
  await BarretenbergSync.initSingleton();
  console.log(`Server is Fire at http://localhost:${port}`);
});