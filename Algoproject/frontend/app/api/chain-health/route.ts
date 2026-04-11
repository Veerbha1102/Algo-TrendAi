import { NextRequest, NextResponse } from "next/server";
import { AlgorandClient } from "@algorandfoundation/algokit-utils";

/**
 * GET /api/chain-health?address=<algorand_address>
 *
 * Uses AlgoKit's AlgorandClient to fetch live on-chain analytics for the
 * bot wallet directly from the Algorand Testnet.
 *
 * Powered by: @algorandfoundation/algokit-utils
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json(
      { error: "address query param is required" },
      { status: 400 }
    );
  }

  try {
    // AlgoKit: initialise a client pointed at Algorand Testnet
    const algorand = AlgorandClient.testNet();

    // Fetch account info and current network status in parallel
    const [accountInfo, networkStatus] = await Promise.all([
      algorand.client.algod.accountInformation(address).do(),
      algorand.client.algod.status().do(),
    ]);

    // microAlgos → ALGO helper
    const toAlgo = (microAlgos: bigint | number) =>
      Number(microAlgos) / 1_000_000;

    const balance        = toAlgo(accountInfo.amount);
    const minBalance     = toAlgo(accountInfo.minBalance);
    const pendingRewards = toAlgo(accountInfo.pendingRewards);
    const availBalance   = Math.max(0, balance - minBalance);
    const totalAssets    = accountInfo.assets?.length ?? 0;
    const networkRound   = Number(networkStatus.lastRound);
    const accountStatus  = accountInfo.status ?? "Offline";


    return NextResponse.json({
      address,
      balance,
      minBalance,
      availBalance,
      pendingRewards,
      totalAssets,
      networkRound,
      status: accountStatus,
      source: "AlgoKit — @algorandfoundation/algokit-utils — Algorand Testnet",
    });

  } catch (err: any) {
    console.error("[chain-health] AlgoKit error:", err?.message ?? err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to fetch chain data" },
      { status: 502 }
    );
  }
}
