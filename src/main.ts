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
import { getBridgeBalances } from "./modules/evm";

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
  try {
    const wallet = await generateWallet();

    res.send({
      status: true,
      data: wallet
    });
  } catch (e) {
    console.log(e);
  }
});

app.post('/aztecBalances', async (req: Request, res: Response) => {
  try {
    const publicBalances = await getPublicBalances(req.body.walletId);
    const privateBalances = await getPrivateBalances(req.body.walletId);

    res.send({
      status: true,
      data: {
        public: publicBalances,
        private: privateBalances
      }
    });
  } catch (e) {
    console.log(e);
  }
});

app.get('/bridgeBalances', async (req: Request, res: Response) => {
  try {
    const balances = await getBridgeBalances();

    res.send({
      status: true,
      data: balances
    });
  } catch (e) {
    console.log(e);
  }
});


app.post('/mintPublic', async (req: Request, res: Response) => {
  try {
    const status = await mintPublic(req.body.token, req.body.amount, req.body.walletId);

    res.send(status);
  } catch (e) {
    console.log(e);
  }
});

app.post('/mintPrivate', async (req: Request, res: Response) => {
  try {
    const status = await mintPrivate(req.body.token, req.body.amount, req.body.walletId);

    res.send(status);
  } catch (e) {
    console.log(e);
  }
});

app.post('/shieldBalance', async (req: Request, res: Response) => {
  try {
    const balances = await shieldBalance(req.body.token, req.body.amount, req.body.walletId);

    res.send({
      status: true,
      data: balances
    });
  } catch (e) {
    console.log(e);
  }
});

app.post('/unshieldBalance', async (req: Request, res: Response) => {
  try {
    const balances = await unshieldBalance(req.body.token, req.body.amount, req.body.walletId);

    res.send({
      status: true,
      data: balances
    });
  } catch (e) {
    console.log(e);
  }
});

app.post('/swapPublic', async (req: Request, res: Response) => {
  try {
    const status = await swapPublic(req.body.tokenFrom, req.body.amountFrom, req.body.walletId);

    res.send(status);
  } catch (e) {
    console.log(e);
  }
});

app.listen(port, async () => {
  await BarretenbergSync.initSingleton();
  console.log(`Server is Fire at http://localhost:${port}`);
});