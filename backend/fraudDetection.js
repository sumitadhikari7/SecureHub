"use strict";

const MODEL = {
  features: [
    "Bidder_Tendency",
    "Bidding_Ratio",
    "Successive_Outbidding",
    "Last_Bidding",
    "Auction_Bids",
    "Starting_Price_Average",
    "Early_Bidding",
    "Winning_Ratio",
    "Auction_Duration",
  ],
  scaler_mean: [
    0.14241122584671667,
    0.12763222058287274,
    0.10403481012658228,
    0.4652289728638247,
    0.23204303934948708,
    0.46968420854845844,
    0.43443894922877613,
    0.369074054425436,
    4.6188686708860756,
  ],
  scaler_scale: [
    0.19643686506210073,
    0.13175059908552883,
    0.28013675241580815,
    0.3806685493594738,
    0.25665244797267506,
    0.48997780018662773,
    0.3815842053237655,
    0.43743047032473525,
    2.458780439921359,
  ],
  coef: [
    0.5280626378130601,  // Bidder_Tendency
    0.11588491257600984, // Bidding_Ratio
    3.7927876356992734,  // Successive_Outbidding
    0.1892280901502875,  // Last_Bidding
    -0.11422337459016156,// Auction_Bids
    0.14377149470991732, // Starting_Price_Average
    0.02389736716566386, // Early_Bidding
    2.0986593196958423,  // Winning_Ratio
    0.3363875976672472,  // Auction_Duration
  ],
  intercept: -5.446561135785152,
  threshold: 0.65,
};

/**
 * Standard Sigmoid Activation Function
 */
function sigmoid(z) {
  return 1 / (1 + Math.exp(-z));
}

/**
 * Computes fraud probability given a feature map.
 */
function scoreBid(featureValues) {
  const z = MODEL.features.reduce((sum, name, i) => {
    const raw = Number(featureValues[name]) || 0;
    const scaled = (raw - MODEL.scaler_mean[i]) / MODEL.scaler_scale[i];
    return sum + scaled * MODEL.coef[i];
  }, MODEL.intercept);

  return sigmoid(z);
}

/**
 * Computes proxies for each feature on EVERY bid using a sliding window for recent activity.
 */
async function computeFeatures(client, { auctionId, bidderId }) {
  const targetBidder = Number(bidderId);

  const auctionRes = await client.query(
    `SELECT starting_price, current_price, start_time, end_time FROM auctions WHERE auction_id = $1`,
    [auctionId]
  );
  const auction = auctionRes.rows[0];
  if (!auction) return null;

  const start = new Date(auction.start_time).getTime();
  const end = new Date(auction.end_time).getTime();
  const durationMs = Math.max(end - start, 1);
  const durationDays = durationMs / (1000 * 60 * 60 * 24);

  // Fetch all bids chronologically
  const bidsRes = await client.query(
    `SELECT bidder_id, bid_amount, bid_time FROM bids WHERE auction_id = $1 ORDER BY bid_time ASC`,
    [auctionId]
  );
  const bids = bidsRes.rows;
  const totalBids = bids.length;
  const myBids = bids.filter((b) => Number(b.bidder_id) === targetBidder);

  // Dollar floor for "meaningful" price jumps, scaled to this auction's
  // starting price rather than a flat number — a $1 -> $3 jump on a $30
  // item and a $500 -> $1500 jump on a $5,000 item are proportionally the
  // same event and should be treated the same way. Minimum floor of $5
  // keeps near-zero-starting-price items from having a ~$0 floor.
  const dollarFloor = Math.max(Number(auction.starting_price) * 0.05, 5);

  // 1. Successive_Outbidding Proxy (SLIDING WINDOW: Last 3 Outbid Events)
  const outbidPenalties = [];

  for (let i = 1; i < bids.length; i++) {
    const currentBidder = Number(bids[i].bidder_id);
    const prevBidder = Number(bids[i - 1].bidder_id);

    if (currentBidder === targetBidder && prevBidder !== targetBidder) {
      // Speed check: response <= 15 seconds after being outbid
      const currentMs = new Date(bids[i].bid_time).getTime();
      const prevMs = new Date(bids[i - 1].bid_time).getTime();
      const timeDiffSec = (currentMs - prevMs) / 1000;
      const isRapid = timeDiffSec <= 15;

      // --- Price checks, based on the bid this bidder is actually
      // responding to (prevAmount) rather than the auction's live
      // current_price ---
      const prevAmount = Number(bids[i - 1].bid_amount);
      const currentAmount = Number(bids[i].bid_amount);

      const dollarIncrease = currentAmount - prevAmount;
      const priceRatio = prevAmount > 0 ? currentAmount / prevAmount : 0;

      // (A) Absolute ratio check — always applicable, coarse backstop.
      // Catches bids that objectively double/triple the total price,
      // regardless of auction stage.
      const isPriceDouble =
        prevAmount > 0 &&
        dollarIncrease >= dollarFloor &&
        priceRatio >= 2.0;

      const isPriceTriple =
        prevAmount > 0 &&
        dollarIncrease >= dollarFloor &&
        priceRatio >= 3.0;

      // (B) Increment-spike check — compares this bidder's step size
      // against the PREVIOUS bidder's step size, so it stays sensitive
      // late in an auction where the absolute ratio check goes blind
      // (doubling a $2,000 price requires a $2,000 overpay).
      //
      // Two guards keep this from double-counting with check (A):
      //   1. It only runs when the absolute check did NOT already fire —
      //      (A) is sufficient on its own; (B) exists to catch what (A)
      //      misses, not to escalate what (A) already caught.
      //   2. The floor on "was the previous increment even meaningful"
      //      is relative to prevAmount (the going price at that point),
      //      not the fixed starting_price. A normal $10 step on a $110
      //      bid is ordinary behavior everywhere in the auction, not
      //      just at the start — so it shouldn't count as a valid
      //      baseline to compare a later jump against.
      let isIncrementSpike = false;
      let isIncrementTripleSpike = false;
      let prevIncrease = null;

      const absoluteCheckFired = isPriceDouble || isPriceTriple;

      if (!absoluteCheckFired && i >= 2) {
        const prevPrevAmount = Number(bids[i - 2].bid_amount);
        prevIncrease = prevAmount - prevPrevAmount;

        const relativeIncrementFloor = Math.max(prevAmount * 0.02, 2);

        if (prevIncrease >= relativeIncrementFloor) {
          const incrementRatio = dollarIncrease / prevIncrease;
          isIncrementSpike = incrementRatio >= 2.0;
          isIncrementTripleSpike = incrementRatio >= 3.0;
        }
      }

      let eventPenalty = 0;

      // Rapid response
      if (isRapid) {
        eventPenalty += 0.30;
      }

      // Price escalation — exactly one of the two check families
      // contributes per event (guarded above), so there's no stacking.
      // 3x (by either measure) gets the stronger 0.70 penalty.
      // Otherwise, 2x (by either measure) gets the normal 0.30 penalty.
      if (isPriceTriple || isIncrementTripleSpike) {
        eventPenalty += 0.70;
      } else if (isPriceDouble || isIncrementSpike) {
        eventPenalty += 0.30;
      }

      // Never allow one event to exceed 1.0
      eventPenalty = Math.min(eventPenalty, 1.0);

      if (process.env.DEBUG_FRAUD) {
        console.log("Outbid event:", {
          previousBid: prevAmount,
          currentBid: currentAmount,
          dollarFloor: Number(dollarFloor.toFixed(2)),
          priceRatio: Number(priceRatio.toFixed(2)),
          prevIncrease,
          currentIncrease: dollarIncrease,
          rapid: isRapid,
          priceDouble: isPriceDouble,
          priceTriple: isPriceTriple,
          incrementSpike: isIncrementSpike,
          incrementTripleSpike: isIncrementTripleSpike,
          eventPenalty,
        });
      }

      outbidPenalties.push(eventPenalty);
    }
  }

  // Take ONLY the last 3 outbid events to prevent overall history dilution
  const WINDOW_SIZE = 3;
  const recentPenalties = outbidPenalties.slice(-WINDOW_SIZE);

  const successiveOutbidding = recentPenalties.length > 0
    ? Math.min(recentPenalties.reduce((sum, p) => sum + p, 0) / recentPenalties.length, 1.0)
    : 0;

  // 2. Bidding_Ratio Proxy
  const biddingRatio = totalBids > 0 ? myBids.length / totalBids : 0;

  // 3. Early_Bidding / Last_Bidding Proxies
  const latestMyBidTime = myBids.length ? new Date(myBids[myBids.length - 1].bid_time).getTime() : start;
  const earliestMyBidTime = myBids.length ? new Date(myBids[0].bid_time).getTime() : start;

  const earlyBidding = Math.min(Math.max((earliestMyBidTime - start) / durationMs, 0), 1);
  const lastBidding = Math.min(Math.max((latestMyBidTime - start) / durationMs, 0), 1);

  // 4. Auction_Bids Proxy
  const auctionBids = totalBids / (totalBids + 5);

  // 5. Starting_Price_Average Proxy
  const startingPriceAverage = Math.min(
    Number(auction.starting_price) / Math.max(Number(auction.current_price), Number(auction.starting_price), 1),
    1
  );

  // 6. Winning_Ratio Proxy
  const winRes = await client.query(
    `SELECT
        COUNT(*) FILTER (WHERE ended_auction)::int AS participated,
        COUNT(*) FILTER (WHERE ended_auction AND is_top)::int AS won
     FROM (
       SELECT b.auction_id,
              (a.end_time <= NOW()) AS ended_auction,
              (b.bid_amount = a.current_price) AS is_top
       FROM bids b
       JOIN auctions a ON a.auction_id = b.auction_id
       WHERE b.bidder_id = $1
       GROUP BY b.auction_id, a.end_time, a.current_price, b.bid_amount
     ) t`,
    [bidderId]
  );
  const participated = Number(winRes.rows[0]?.participated) || 0;
  const won = Number(winRes.rows[0]?.won) || 0;
  const rawWinningRatio = participated > 0 ? won / participated : 0.369;
  const winningRatio = participated < 3 ? 0.369 : rawWinningRatio;

  // 7. Bidder_Tendency Proxy
  const tendencyRes = await client.query(
    `SELECT COUNT(*)::int AS total_bids, COUNT(DISTINCT auction_id)::int AS distinct_auctions
     FROM bids WHERE bidder_id = $1`,
    [bidderId]
  );
  const total_bids = Number(tendencyRes.rows[0]?.total_bids) || 0;
  const distinct_auctions = Number(tendencyRes.rows[0]?.distinct_auctions) || 0;
  const avgBidsPerAuction = distinct_auctions > 0 ? total_bids / distinct_auctions : 0;
  const bidderTendency = avgBidsPerAuction / (avgBidsPerAuction + 5);

  return {
    Bidder_Tendency: bidderTendency,
    Bidding_Ratio: biddingRatio,
    Successive_Outbidding: successiveOutbidding,
    Last_Bidding: lastBidding,
    Auction_Bids: auctionBids,
    Starting_Price_Average: startingPriceAverage,
    Early_Bidding: earlyBidding,
    Winning_Ratio: winningRatio,
    Auction_Duration: durationDays,
  };
}

module.exports = { scoreBid, computeFeatures, MODEL };