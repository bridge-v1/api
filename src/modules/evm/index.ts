import fs from 'fs';
import { ethers } from 'ethers';
import dotenv from "dotenv";

dotenv.config();

const provider = new ethers.JsonRpcProvider(process.env.L1_RPC_URL);
const wmatic = new ethers.Contract(
    "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
    JSON.parse(fs.readFileSync('./src/modules/evm/artifacts/IERC20.json').toString()).abi,
    provider
);
const usdt = new ethers.Contract(
  "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
  JSON.parse(fs.readFileSync('./src/modules/evm/artifacts/IERC20.json').toString()).abi,
  provider
);

export async function getBridgeBalances() {
    const wmaticBalance = Number(await wmatic.balanceOf(process.env.L1_BRIDGE_ADDRESS));
    const usdtBalance = Number(await usdt.balanceOf(process.env.L1_BRIDGE_ADDRESS));

    return {
        WMATIC: wmaticBalance,
        USDT: usdtBalance
    };
}