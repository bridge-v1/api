import {
  AccountWalletWithPrivateKey,
  AztecAddress, computeAuthWitMessageHash, computeMessageSecretHash,
  createPXEClient, ExtendedNote,
  Fq,
  Fr,
  getSandboxAccountsWallets,
  getSchnorrAccount, Note
} from "@aztec/aztec.js";
import { CompleteAddress } from "@aztec/circuits.js";
// @ts-ignore
import { TokenContract } from "@aztec/noir-contracts/types";

const pxe = createPXEClient(process.env.PXE_URL || "http://localhost:8080");
const accounts: AccountWalletWithPrivateKey[] = [];


export async function getOwnerWallet() {
  let ownerWallet: AccountWalletWithPrivateKey;
  [ownerWallet] = await getSandboxAccountsWallets(pxe);

  return ownerWallet;
}

export async function deployTokens(ownerWallet: AccountWalletWithPrivateKey) {
  const WMATIC = await TokenContract.deploy(ownerWallet, ownerWallet.getAddress()).send().deployed();
  const USDT = await TokenContract.deploy(ownerWallet, ownerWallet.getAddress()).send().deployed();

  process.env.WMATIC_ADDRESS = WMATIC.address.toString();
  process.env.USDT_ADDRESS = USDT.address.toString();
}

export async function generateWallet() {
  const encryptionPrivateKey = Fq.random();
  const signingPrivateKey = Fq.random();
  const wallet = await getSchnorrAccount(
    pxe,
    encryptionPrivateKey,
    signingPrivateKey
  ).waitDeploy();

  accounts.push(wallet)

  return {
    walletId: accounts.length - 1,
    walletAddress: wallet.getAddress().toString()
  }
}

export async function loadWallet(id: number) {
  return accounts[id]
}

export async function getPublicBalances (id: number) {
  const wallet = await loadWallet(id);

  const WMATIC = await TokenContract.at(AztecAddress.fromString(process.env.WMATIC_ADDRESS), wallet);
  const USDT = await TokenContract.at(AztecAddress.fromString(process.env.USDT_ADDRESS), wallet);

  const wmaticBalance = await WMATIC.methods.balance_of_public(wallet.getAddress()).view();
  const usdtBalance = await USDT.methods.balance_of_public(wallet.getAddress()).view();

  return {
    WMATIC: wmaticBalance.toString(),
    USDT: usdtBalance.toString()
  }
}

export async function getPrivateBalances (id: number) {
  const wallet = await loadWallet(id);

  const WMATIC = await TokenContract.at(AztecAddress.fromString(process.env.WMATIC_ADDRESS), wallet);
  const USDT = await TokenContract.at(AztecAddress.fromString(process.env.USDT_ADDRESS), wallet);

  const wmaticBalance = await WMATIC.methods.balance_of_private(wallet.getAddress()).view();
  const usdtBalance = await USDT.methods.balance_of_private(wallet.getAddress()).view();

  return {
    WMATIC: wmaticBalance.toString(),
    USDT: usdtBalance.toString()
  }
}

export async function mintPublic (token: string, amount: number, id: number) {
  const wallet = await loadWallet(id);
  const ownerWallet = await getOwnerWallet();

  let tokenContract;
  let tokenOwnerContract;
  if (token.toLowerCase() === 'wmatic') {
    tokenContract = await TokenContract.at(AztecAddress.fromString(process.env.WMATIC_ADDRESS), wallet);
    tokenOwnerContract = await TokenContract.at(AztecAddress.fromString(process.env.WMATIC_ADDRESS), ownerWallet);
  } else if (token.toLowerCase() === 'usdt') {
    tokenContract = await TokenContract.at(AztecAddress.fromString(process.env.USDT_ADDRESS), wallet);
    tokenOwnerContract = await TokenContract.at(AztecAddress.fromString(process.env.USDT_ADDRESS), ownerWallet);
  } else {
    return {
      status: false,
      reason: 'No such token'
    }
  }
  try {
    await tokenOwnerContract.methods.set_minter(wallet.getAddress(), true).send().wait();
    await tokenContract.methods.mint_public(wallet.getAddress(), amount).send().wait();
    await tokenOwnerContract.methods.set_minter(wallet.getAddress(), false).send().wait();

    return {
      status: true
    }
  } catch (e) {
    return {
      status: false,
      reason: e
    }
  }
}

export async function mintPrivate (token: string, amount: number, id: number) {
  const wallet = await loadWallet(id);
  const ownerWallet = await getOwnerWallet();

  let tokenContract;
  let tokenOwnerContract;
  if (token.toLowerCase() === 'wmatic') {
    tokenContract = await TokenContract.at(AztecAddress.fromString(process.env.WMATIC_ADDRESS), wallet);
    tokenOwnerContract = await TokenContract.at(AztecAddress.fromString(process.env.WMATIC_ADDRESS), ownerWallet);
  } else if (token.toLowerCase() === 'usdt') {
    tokenContract = await TokenContract.at(AztecAddress.fromString(process.env.USDT_ADDRESS), wallet);
    tokenOwnerContract = await TokenContract.at(AztecAddress.fromString(process.env.USDT_ADDRESS), ownerWallet);
  } else {
    return {
      status: false,
      reason: 'No such token'
    }
  }
  try {
    await tokenOwnerContract.methods.set_minter(wallet.getAddress(), true).send().wait();

    const secret = Fr.random();
    const secretHash = computeMessageSecretHash(secret);

    const receipt = await tokenContract.methods.mint_private(BigInt(amount), secretHash).send().wait();

    const pendingShieldsStorageSlot = new Fr(BigInt(5));
    const note = new Note([new Fr(BigInt(amount)), secretHash]);
    await pxe.addNote(new ExtendedNote(note, wallet.getAddress(), tokenContract.address, pendingShieldsStorageSlot, receipt.txHash));

    // Make the tokens spendable by redeeming them using the secret
    // (converts the "pending shield note" created above to a "token note")
    await tokenContract.methods.redeem_shield(wallet.getAddress(), BigInt(amount), secret).send().wait();

    await tokenOwnerContract.methods.set_minter(wallet.getAddress(), false).send().wait();

    return {
      status: true
    }
  } catch (e) {
    console.log(e);
    return {
      status: false,
      reason: e
    }
  }
}

export async function shieldBalance (token: string, amount: number, id: number) {
  const wallet = await loadWallet(id);

  let tokenContract;
  if (token.toLowerCase() === 'wmatic') {
    tokenContract = await TokenContract.at(AztecAddress.fromString(process.env.WMATIC_ADDRESS), wallet);
  } else if (token.toLowerCase() === 'usdt') {
    tokenContract = await TokenContract.at(AztecAddress.fromString(process.env.USDT_ADDRESS), wallet);
  } else {
    return {
      status: false,
      reason: 'No such token'
    }
  }
  try {
    // Nonce should be 0 when acting on behalf of yourself
    // const nonce = Fr.random();
    const nonce = 0;
    const secret = Fr.random();
    const secretHash = computeMessageSecretHash(secret);

    // We need to compute the message we want to sign and add it to the wallet as approved
    const transaction = tokenContract.methods.shield(wallet.getAddress(), amount, secretHash, nonce);
    const messageHash = computeAuthWitMessageHash(wallet.getAddress(), transaction.request());
    await wallet.setPublicAuth(messageHash, true).send().wait();

    const receipt = await transaction.send().wait();

    const pendingShieldsStorageSlot = new Fr(BigInt(5));
    const note = new Note([new Fr(BigInt(amount)), secretHash]);
    await pxe.addNote(new ExtendedNote(note, wallet.getAddress(), tokenContract.address, pendingShieldsStorageSlot, receipt.txHash));

    // Make the tokens spendable by redeeming them using the secret
    // (converts the "pending shield note" created above to a "token note")
    await tokenContract.methods.redeem_shield(wallet.getAddress(), BigInt(amount), secret).send().wait();

    return { status: true }
  } catch (e) {
    console.log(e);
    return {
      status: false,
      reason: e
    }
  }
}

export async function unshieldBalance (token: string, amount: number, id: number) {
  const wallet = await loadWallet(id);

  let tokenContract;
  if (token.toLowerCase() === 'wmatic') {
    tokenContract = await TokenContract.at(AztecAddress.fromString(process.env.WMATIC_ADDRESS), wallet);
  } else if (token.toLowerCase() === 'usdt') {
    tokenContract = await TokenContract.at(AztecAddress.fromString(process.env.USDT_ADDRESS), wallet);
  } else {
    return {
      status: false,
      reason: 'No such token'
    }
  }
  try {
    await tokenContract.methods.unshield(wallet.getAddress(), wallet.getAddress(), amount, 0).send().wait();

    return { status: true }
  } catch (e) {
    console.log(e);
    return {
      status: false,
      reason: e
    }
  }
}