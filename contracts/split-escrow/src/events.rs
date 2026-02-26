//! # Events Module for Split Escrow Contract
//!
//! I'm defining all contract events here for off-chain tracking and indexing.
//! These events are crucial for the backend to sync with on-chain state.

use soroban_sdk::{symbol_short, Symbol, Address, Env, String};

/// Emit when the contract is initialized
///
/// I'm emitting this once during contract setup so indexers
/// know when the contract became operational.
pub fn emit_initialized(env: &Env, admin: &Address) {
    env.events()
        .publish((symbol_short!("init"),), (admin.clone(),));
}

/// Emit when a new split is created
///
/// I'm including the key details so the backend can create
/// a corresponding record without querying the contract.
pub fn emit_split_created(env: &Env, split_id: u64, creator: &Address, total_amount: i128) {
    env.events().publish(
        (symbol_short!("created"),),
        (split_id, creator.clone(), total_amount),
    );
}

/// Emit when a deposit is received
///
/// I'm emitting this for each deposit so the backend can
/// track partial payments and update participant status.
pub fn emit_deposit_received(env: &Env, split_id: u64, participant: &Address, amount: i128) {
    env.events().publish(
        (symbol_short!("deposit"),),
        (split_id, participant.clone(), amount),
    );
}

/// Emit when funds are released to the creator
///
/// I'm including the total amount released for reconciliation
/// with the backend's payment records.
pub fn emit_funds_released(
    env: &Env,
    split_id: u64,
    recipient: &Address,
    amount: i128,
    timestamp: u64,
) {
    env.events().publish(
        (symbol_short!("released"),),
        (split_id, recipient.clone(), amount, timestamp),
    );
}

/// Emit when escrow is completed (fully funded)
pub fn emit_escrow_completed(env: &Env, split_id: u64, total_amount: i128) {
    env.events()
        .publish((symbol_short!("completed"),), (split_id, total_amount));
}

/// Emit when a split is cancelled
///
/// I'm emitting this so the backend can trigger refund processing
/// for any participants who have already deposited.
pub fn emit_split_cancelled(env: &Env, split_id: u64) {
    env.events()
        .publish((symbol_short!("cancel"),), (split_id,));
}

/// Emit when a refund is processed
///
/// I'm tracking each refund individually for audit purposes.
#[allow(dead_code)]
pub fn emit_refund_processed(env: &Env, split_id: u64, participant: &Address, amount: i128) {
    env.events().publish(
        (symbol_short!("refund"),),
        (split_id, participant.clone(), amount),
    );
}

// ============================================
// Insurance Events
// ============================================

/// Emit when an insurance policy is purchased
pub fn emit_insurance_purchased(
    env: &Env,
    insurance_id: &String,
    split_id: &String,
    policy_holder: &Address,
    premium: i128,
    coverage_amount: i128,
) {
    env.events().publish(
        (Symbol::new(env, "ins_purchased"),),
        (
            insurance_id.clone(),
            split_id.clone(),
            policy_holder.clone(),
            premium,
            coverage_amount,
        ),
    );
}

/// Emit when an insurance claim is filed
pub fn emit_claim_filed(
    env: &Env,
    claim_id: &String,
    insurance_id: &String,
    claimant: &Address,
    claim_amount: i128,
) {
    env.events().publish(
        (Symbol::new(env, "claim_filed"),),
        (
            claim_id.clone(),
            insurance_id.clone(),
            claimant.clone(),
            claim_amount,
        ),
    );
}

/// Emit when an insurance claim is processed
pub fn emit_claim_processed(
    env: &Env,
    claim_id: &String,
    insurance_id: &String,
    approved: bool,
    payout_amount: i128,
) {
    env.events().publish(
        (Symbol::new(env, "claim_processed"),),
        (
            claim_id.clone(),
            insurance_id.clone(),
            approved,
            payout_amount,
        ),
    );
}

/// Emit when an insurance payout is made
pub fn emit_payout_made(
    env: &Env,
    claim_id: &String,
    recipient: &Address,
    amount: i128,
) {
    env.events().publish(
        (Symbol::new(env, "payout_made"),),
        (claim_id.clone(), recipient.clone(), amount),
    );
}

/// Emit when user activity is tracked for rewards
///
/// This event is emitted whenever a user performs an action
/// that contributes to their rewards calculation.
pub fn emit_activity_tracked(env: &Env, user: &Address, activity_type: &str, split_id: u64, amount: i128) {
    env.events()
        .publish(
            (Symbol::new(env, "activity_tracked"),),
            (user.clone(), activity_type, split_id, amount)
        );
}

/// Emit when rewards are calculated for a user
///
/// This event shows the total rewards earned by a user.
pub fn emit_rewards_calculated(env: &Env, user: &Address, total_rewards: i128, available_rewards: i128) {
    env.events()
        .publish(
            (Symbol::new(env, "rewards_calculated"),),
            (user.clone(), total_rewards, available_rewards)
        );
}

/// Emit when rewards are claimed by a user
///
/// This event is emitted when a user successfully claims their rewards.
pub fn emit_rewards_claimed(env: &Env, user: &Address, amount_claimed: i128) {
    env.events()
        .publish(
            (Symbol::new(env, "rewards_claimed"),),
            (user.clone(), amount_claimed)
        );
}

/// Emit when verification is submitted for a split
///
/// This event is emitted when someone submits evidence for split verification.
pub fn emit_verification_submitted(env: &Env, verification_id: &String, split_id: &String, requester: &Address) {
    env.events()
        .publish(
            (Symbol::new(env, "verification_submitted"),),
            (verification_id.clone(), split_id.clone(), requester.clone())
        );
}

/// Emit when verification is completed
///
/// This event is emitted when an oracle processes a verification request.
pub fn emit_verification_completed(env: &Env, verification_id: &String, verified: bool, verifier: &Address) {
    env.events()
        .publish(
            (Symbol::new(env, "verification_completed"),),
            (verification_id.clone(), verified, verifier.clone())
        );
}

/// Emit when atomic swap is created
///
/// This event is emitted when a new atomic swap is initiated.
pub fn emit_swap_created(env: &Env, swap_id: &String, participant_a: &Address, participant_b: &Address, amount_a: i128, amount_b: i128) {
    env.events()
        .publish(
            (Symbol::new(env, "swap_created"),),
            (swap_id.clone(), participant_a.clone(), participant_b.clone(), amount_a, amount_b)
        );
}

/// Emit when atomic swap is executed
///
/// This event is emitted when an atomic swap is successfully completed.
pub fn emit_swap_executed(env: &Env, swap_id: &String, executor: &Address) {
    env.events()
        .publish(
            (Symbol::new(env, "swap_executed"),),
            (swap_id.clone(), executor.clone())
        );
}

/// Emit when atomic swap is refunded
///
/// This event is emitted when an atomic swap is refunded due to timeout.
pub fn emit_swap_refunded(env: &Env, swap_id: &String, refunder: &Address) {
    env.events()
        .publish(
            (Symbol::new(env, "swap_refunded"),),
            (swap_id.clone(), refunder.clone())
        );
}

/// Emit when oracle node is registered
///
/// This event is emitted when a new oracle node joins the network.
pub fn emit_oracle_registered(env: &Env, oracle_address: &Address, stake: i128) {
    env.events()
        .publish(
            (Symbol::new(env, "oracle_registered"),),
            (oracle_address.clone(), stake)
        );
}

/// Emit when oracle submits price
///
/// This event is emitted when an oracle submits a price for an asset pair.
pub fn emit_price_submitted(env: &Env, oracle_address: &Address, asset_pair: &String, price: i128) {
    env.events()
        .publish(
            (Symbol::new(env, "price_submitted"),),
            (oracle_address.clone(), asset_pair.clone(), price)
        );
}

/// Emit when consensus price is calculated
///
/// This event is emitted when the network reaches consensus on a price.
pub fn emit_consensus_reached(env: &Env, asset_pair: &String, consensus_price: i128, confidence: u32, participating_oracles: u32) {
    env.events()
        .publish(
            (Symbol::new(env, "consensus_reached"),),
            (asset_pair.clone(), consensus_price, confidence, participating_oracles)
        );
}

/// Emit when bridge transaction is initiated
///
/// This event is emitted when a cross-chain bridge transaction is started.
pub fn emit_bridge_initiated(env: &Env, bridge_id: &String, source_chain: &String, destination_chain: &String, amount: i128, recipient: &String) {
    env.events()
        .publish(
            (Symbol::new(env, "bridge_initiated"),),
            (bridge_id.clone(), source_chain.clone(), destination_chain.clone(), amount, recipient.clone())
        );
}

/// Emit when bridge transaction is completed
///
/// This event is emitted when a bridge transaction is successfully completed.
pub fn emit_bridge_completed(env: &Env, bridge_id: &String, recipient: &String) {
    env.events()
        .publish((Symbol::new(env, "bridge_completed"),), (bridge_id.clone(), recipient.clone()));
}

/// Emit when bridge transaction is refunded
///
/// This event is emitted when a bridge transaction is refunded.
pub fn emit_bridge_refunded(env: &Env, bridge_id: &String, sender: &Address) {
    env.events()
        .publish((Symbol::new(env, "bridge_refunded"),), (bridge_id.clone(), sender.clone()));
}

// Removed invalid contractevent functions
