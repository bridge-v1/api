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
  deployBridge,
  swapPublic, setRelayer
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
    status: true,
    data: address
  });
});

app.post('/deployTokens', async (req: Request, res: Response) => {
  const ownerWallet = await getOwnerWallet();
  const addresses = await deployTokens(ownerWallet);

  res.send({
    status: true,
    data: addresses
  });
});

app.post('/deployBridge', async (req: Request, res: Response) => {
  const ownerWallet = await getOwnerWallet();
  const address = await deployBridge(ownerWallet);

  res.send({
    status: true,
    data: address
  });
});

app.get('/config', async (req: Request, res: Response) => {
  res.send({
    status: true,
    data: {
      WMATIC: process.env.WMATIC_ADDRESS,
      USDT: process.env.USDT_ADDRESS,
      bridge: process.env.BRIDGE_ADDRESS,
    }
  });
});

app.post('/setRelayer', async (req: Request, res: Response) => {
  const status = await setRelayer(req.body.relayerAddress);
  res.send(status);
});

app.post('/generateWallet', async (req: Request, res: Response) => {
  const wallet = await generateWallet();

  res.send({
    status: true,
    data: wallet
  });
});

app.post('/aztecBalances', async (req: Request, res: Response) => {
  const publicBalances = await getPublicBalances(req.body.walletId);
  const privateBalances = await getPrivateBalances(req.body.walletId);

  res.send({
    status: true,
    data: {
      public: publicBalances,
      private: privateBalances
    }
  });
});

app.post('/publicBalances', async (req: Request, res: Response) => {
  const balances = await getPublicBalances(req.body.walletId);

  res.send({
    status: true,
    data: balances
  });
});

app.post('/privateBalances', async (req: Request, res: Response) => {
  const balances = await getPrivateBalances(req.body.walletId);

  res.send({
    status: true,
    data: balances
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

  res.send({
    status: true,
    data: balances
  });
});

app.post('/unshieldBalance', async (req: Request, res: Response) => {
  const balances = await unshieldBalance(req.body.token, req.body.amount, req.body.walletId);

  res.send({
    status: true,
    data: balances
  });
});

app.post('/swapPublic', async (req: Request, res: Response) => {
  const status = await swapPublic(req.body.tokenFrom, req.body.amountFrom, req.body.walletId);

  res.send(status);
});

app.listen(port, async () => {
  await BarretenbergSync.initSingleton();
  console.log(`Server is Fire at http://localhost:${port}`);
});