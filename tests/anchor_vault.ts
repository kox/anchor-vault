import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AnchorVault } from "../target/types/anchor_vault";
import { PublicKey, Commitment, Keypair, SystemProgram, LAMPORTS_PER_SOL, Transaction, } from "@solana/web3.js"
import { assert } from "chai";
import { BN } from "bn.js";

describe("anchor_vault", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const connection = provider.connection;

  const program = anchor.workspace.AnchorVault as Program<AnchorVault>;

  const confirmTx = async (signature: string) => {
    const latestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction(
      {
        signature,
        ...latestBlockhash,
      },
      "confirmed"
    )
    return signature
  }

  const log = async (signature: string): Promise<string> => {
    console.log(
      `Your transaction signature: https://explorer.solana.com/transaction/${signature}?cluster=custom&customUrl=${connection.rpcEndpoint}`
    );
    return signature;
  };


  const user = Keypair.generate();

  const state = PublicKey.findProgramAddressSync([Buffer.from("state"), user.publicKey.toBytes()], program.programId)[0];
  const vault = PublicKey.findProgramAddressSync([Buffer.from("vault"), state.toBytes()], program.programId)[0];

  console.log(`user: ${user.publicKey.toString()}`)

  const vaultAddress = PublicKey.findProgramAddressSync([
    Buffer.from("state"),
    user.publicKey.toBuffer()
  ], program.programId
  )[0];

  it('should get some SOL for testing', async () => {
    let tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: provider.publicKey,
        toPubkey: user.publicKey,
        lamports: 10 * LAMPORTS_PER_SOL,
      })
    );

    await provider.sendAndConfirm(tx).then(log);

    const balance = await connection.getBalance(user.publicKey);
    
    assert.equal(balance, 10 * LAMPORTS_PER_SOL);

  });

  it("Is vault initialized and starts with balance 0!", async () => {
    try {
      const tx = await program.methods.initialize()
      .accounts({
        signer: user.publicKey,
        state,
        vault,
        systemProgram: SystemProgram.programId
      })
      .signers([
        user
      ]).rpc()
      .then(confirmTx).then(log);

      const balance = await connection.getBalance(vault);
      assert.equal(balance, 0);
    } catch(e) {
      console.error(e);
      throw (e)
    }
  });

  it("is possible to deposit SOL in the vault and its balance will be reflected", async () => {
    // Add your test here.
    try {
      const tx = await program.methods.deposit(new BN(10000000))
      .accounts({
        signer: user.publicKey,
        state,
        vault,
        systemProgram: SystemProgram.programId
      })
      .signers([
        user
      ]).rpc().then(confirmTx);

      const balance = await connection.getBalance(vault);
      assert.equal(balance, 10000000);
    } catch(e) {
      console.error(e);
      throw (e)
    }
  });


  it("should be possible to withdraw our SOL from the vault", async () => {
    // Add your test here.
    try {
      const tx = await program.methods.withdraw(new BN(1000000))
      .accounts({
        signer: user.publicKey,
        state,
        vault,
        systemProgram: SystemProgram.programId
      })
      .signers([
        user
      ]).rpc().then(confirmTx);
      console.log("Your transaction signature", tx);

      const balance = await connection.getBalance(vault);
      assert.equal(balance, 9000000);
    } catch(e) {
      console.error(e);
      throw (e)
    }
  });

  it("should close the vault and refund the remaining SOL and rent", async () => {
    // Add your test here.
    try {
      const tx = await program.methods.close()
      .accounts({
        signer: user.publicKey,
        state,
        vault,
        systemProgram: SystemProgram.programId
      })
      .signers([
        user
      ]).rpc().then(confirmTx);

      const balance = await connection.getBalance(vault);
      assert.equal(balance, 0);
    } catch(e) {
      console.error(e);
      throw (e)
    }
  });
});
