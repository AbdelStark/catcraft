import * as bitcoin from "bitcoinjs-lib";
import * as ecc from "tiny-secp256k1";
import ECPairFactory from "ecpair";
import { witnessStackToScriptWitness } from "./bitcoin/witness_stack_to_script_witness";

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

// Player credentials (for demonstration purposes)
const playerKeypair = ECPair.fromWIF(
  "cTT3atcdHZ3F83L79niWKfBgdiV2k4r7wUmdCRPbbmSBY7r9BG6L",
  network
);
const playerP2wpkh = bitcoin.payments.p2wpkh({
  pubkey: playerKeypair.publicKey,
  network,
});

console.log("Player's address:", playerP2wpkh.address);
// TODO: Query player's balance and check if it's enough to play the game
// TODO: Display player's balance

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

console.log("Game P2WSH address:", p2wsh.address);

// Function to create and broadcast the funding transaction
const fundGame = async (amount: number) => {
  // In a real implementation, you would use a Bitcoin API or run a node to create and broadcast this transaction
  console.log(
    `Funding the game with ${amount} satoshis to address ${p2wsh.address}`
  );
  // For demonstration, we'll assume the transaction is successful and return a mock txid
  return "0ae1bd19cf7b7c6be8a36d03b1557d78879dc6e519abfe02af9b31d8d3c0253c";
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
const runCatCraftGame = async () => {
  console.log("Welcome to CatCraft!");
  console.log("Funding the game...");

  const gameFunds = 100000; // 100,000 satoshis
  const fundingTxId = await fundGame(gameFunds);
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
    gameFunds,
    playerHead,
    playerBody,
    playerTail
  );

  console.log("\nGame completed!");
  console.log(`Transaction ID: ${gameTransaction.getId()}`);
  console.log("If your cat matches the target, you've won the funds!");
};

// Run the game
runCatCraftGame().catch(console.error);
