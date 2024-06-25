import * as bitcoin from "bitcoinjs-lib";
import * as ecc from "tiny-secp256k1";
import ECPairFactory from "ecpair";
import { witnessStackToScriptWitness } from "./bitcoin/witness_stack_to_script_witness";
import {
  client,
  checkBitcoinConnection,
  getAddressBalance,
  getCurrentBlockHeight,
} from "./bitcoin/bitcoin";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const ECPair = ECPairFactory(ecc);

// Use testnet for the custom Catnet signet
const network = bitcoin.networks.testnet;

// Game constants
const CAT_PARTS = {
  HEAD: {
    SIAMESE: Buffer.from("01", "hex"),
    PERSIAN: Buffer.from("02", "hex"),
    MAINE_COON: Buffer.from("03", "hex"),
  },
  BODY: {
    SLIM: Buffer.from("01", "hex"),
    FLUFFY: Buffer.from("02", "hex"),
    LARGE: Buffer.from("03", "hex"),
  },
  TAIL: {
    SHORT: Buffer.from("01", "hex"),
    LONG: Buffer.from("02", "hex"),
    BUSHY: Buffer.from("03", "hex"),
  },
};

const TARGET_CAT = Buffer.from("010201", "hex"); // Siamese head, Fluffy body, Short tail
const GAME_FUNDS = 100000; // 100,000 satoshis

// Player credentials (for demonstration purposes)
const playerKeypair = ECPair.fromWIF(
  "cTT3atcdHZ3F83L79niWKfBgdiV2k4r7wUmdCRPbbmSBY7r9BG6L",
  network
);
const playerP2wpkh = bitcoin.payments.p2wpkh({
  pubkey: playerKeypair.publicKey,
  network,
});

// Create the CatCraft game script
const createCatCraftScript = () => {
  return bitcoin.script.compile([
    bitcoin.opcodes.OP_CAT,
    bitcoin.opcodes.OP_CAT,
    TARGET_CAT,
    bitcoin.opcodes.OP_EQUAL,
  ]);
};

// Create P2WSH address for the game
const gameWitnessScript = createCatCraftScript();
const p2wsh = bitcoin.payments.p2wsh({
  redeem: { output: gameWitnessScript, network },
  network,
});

// Function to create and broadcast the funding transaction
const fundGame = async (amount: number): Promise<string> => {
  console.log(
    `Funding the game with ${amount} satoshis to address ${p2wsh.address}`
  );
  return await client.sendToAddress(p2wsh.address!, amount);
};

// Function to check if the game is funded
const isGameFunded = async (): Promise<boolean> => {
  const addressInfo = await client.getAddressInfo(p2wsh.address!);
  return addressInfo.balance >= GAME_FUNDS;
};

// Function to wait for manual funding
const waitForManualFunding = async (): Promise<void> => {
  console.log(
    `Please send ${GAME_FUNDS} satoshis to address: ${p2wsh.address}`
  );
  while (!(await isGameFunded())) {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  console.log("Game has been funded!");
};

// Function to play the game
const playCatCraft = (
  fundingTxId: string,
  fundingOutputIndex: number,
  amount: number,
  head: keyof typeof CAT_PARTS.HEAD,
  body: keyof typeof CAT_PARTS.BODY,
  tail: keyof typeof CAT_PARTS.TAIL
) => {
  const psbt = new bitcoin.Psbt({ network });

  // Add the input from the funding transaction
  psbt.addInput({
    hash: fundingTxId,
    index: fundingOutputIndex,
    witnessScript: gameWitnessScript,
    witnessUtxo: {
      script: p2wsh.output!,
      value: amount,
    },
  });

  // Add the output to the player's address
  psbt.addOutput({
    address: playerP2wpkh.address!,
    value: amount - 1000, // Subtract 1000 satoshis for the fee
  });

  // Finalize the input with the chosen cat parts
  const finalizeInput = (_inputIndex: number, input: any) => {
    const redeemPayment = bitcoin.payments.p2wsh({
      redeem: {
        input: bitcoin.script.compile([
          CAT_PARTS.HEAD[head],
          CAT_PARTS.BODY[body],
          CAT_PARTS.TAIL[tail],
        ]),
        output: input.witnessScript,
      },
    });

    const finalScriptWitness = witnessStackToScriptWitness(
      redeemPayment.witness ?? []
    );

    return {
      finalScriptSig: Buffer.from(""),
      finalScriptWitness,
    };
  };

  psbt.finalizeInput(0, finalizeInput);

  // Extract the transaction
  const tx = psbt.extractTransaction();
  console.log(`Transaction Hex: ${tx.toHex()}`);

  // In a real implementation, you would broadcast this transaction to the network
  console.log("Broadcasting transaction...");
  // Mock success message
  console.log(`Success! Transaction ID: ${tx.getId()}`);

  return tx;
};

// Main game flow
const runCatCraftGame = async (autoFund: boolean) => {
  console.log("Welcome to CatCraft!");

  try {
    await checkBitcoinConnection();
    const currentBlockHeight = await getCurrentBlockHeight();
    console.log(`Current block height: ${currentBlockHeight}`);

    console.log("Player's address:", playerP2wpkh.address);
    let balance;
    try {
      balance = await getAddressBalance(playerP2wpkh.address!);
      console.log(`Player's balance: ${balance} BTC`);
    } catch (error) {
      console.error("Failed to get address balance:", error);
      console.log("Continuing with assumed zero balance.");
      balance = 0;
    }

    if (balance < GAME_FUNDS / 100000000) {
      // Convert satoshis to BTC
      console.log("Insufficient funds to play the game.");
      console.log(`Required balance: ${GAME_FUNDS / 100000000} BTC`);
      console.log(`Current balance: ${balance} BTC`);
      return;
    }

    console.log("Game P2WSH address:", p2wsh.address);

    let fundingTxId: string;

    if (autoFund) {
      console.log("Auto-funding the game...");
      fundingTxId = await fundGame(GAME_FUNDS);
    } else {
      await waitForManualFunding();
      // For simplicity, we'll use a mock txid for manual funding
      fundingTxId =
        "0ae1bd19cf7b7c6be8a36d03b1557d78879dc6e519abfe02af9b31d8d3c0253c";
    }

    const fundingOutputIndex = 0;

    console.log(
      "\nGame is ready! Try to create the target cat to win the funds."
    );
    console.log("Target cat: Siamese head, Fluffy body, Short tail");

    // Simulate player's choice
    const playerHead: keyof typeof CAT_PARTS.HEAD = "SIAMESE";
    const playerBody: keyof typeof CAT_PARTS.BODY = "FLUFFY";
    const playerTail: keyof typeof CAT_PARTS.TAIL = "SHORT";

    console.log("\nYour choice:");
    console.log(`Head: ${playerHead}`);
    console.log(`Body: ${playerBody}`);
    console.log(`Tail: ${playerTail}`);

    console.log("\nPlaying the game...");
    const gameTransaction = playCatCraft(
      fundingTxId,
      fundingOutputIndex,
      GAME_FUNDS,
      playerHead,
      playerBody,
      playerTail
    );

    console.log("\nGame completed!");
    console.log(`Transaction ID: ${gameTransaction.getId()}`);
    console.log("If your cat matches the target, you've won the funds!");
  } catch (error) {
    console.error("An error occurred while running the game:", error);
    console.log("Please check your Bitcoin node connection and try again.");
  }
};

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
  .option("auto-fund", {
    alias: "a",
    description: "Automatically fund the game",
    type: "boolean",
  })
  .help()
  .alias("help", "h").argv;

// Run the game
runCatCraftGame((argv as any)["auto-fund"]).catch(console.error);
