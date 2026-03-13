use soroban_sdk::{symbol_short, Symbol, Address, Env, String};

/// Emitted when a new escrow is created for a split.
pub fn emit_escrow_created(
    env: &Env,
    split_id: u64,
    creator: Address,
    total_amount: i128,
    deadline: u64,
) {
    let topics = (symbol_short!("e_created"), split_id);
    let data = (creator, total_amount, deadline, env.ledger().timestamp());
    env.events().publish(topics, data);
}

/// Emitted when a participant deposits funds into the escrow.
pub fn emit_payment_received(
    env: &Env,
    split_id: u64,
    participant: Address,
    amount: i128,
) {
    let topics = (symbol_short!("pmt_recvd"), split_id);
    let data = (participant, amount, env.ledger().timestamp());
    env.events().publish(topics, data);
}

/// Emitted when funds are released to a recipient.
pub fn emit_funds_released(
    env: &Env,
    split_id: u64,
    recipient: Address,
    amount: i128,
) {
    let topics = (symbol_short!("funds_rls"), split_id);
    let data = (recipient, amount, env.ledger().timestamp());
    env.events().publish(topics, data);
}

/// Emitted when the creator explicitly cancels the escrow.
pub fn emit_escrow_cancelled(env: &Env, split_id: u64, cancelled_by: Address) {
    let topics = (symbol_short!("e_cancel"), split_id);
    let data = (cancelled_by, env.ledger().timestamp());
    env.events().publish(topics, data);
}

/// Emitted when the escrow deadline passes with outstanding unfunded amounts.
pub fn emit_escrow_expired(env: &Env, split_id: u64, unfunded_amount: i128) {
    let topics = (symbol_short!("e_expired"), split_id);
    let data = (unfunded_amount, env.ledger().timestamp());
    env.events().publish(topics, data);
}

/// Emitted when a refund is issued to a participant.
pub fn emit_refund_issued(env: &Env, split_id: u64, participant: Address, amount: i128) {
    let topics = (symbol_short!("refund"), split_id);
    let data = (participant, amount, env.ledger().timestamp());
    env.events().publish(topics, data);
}

// ── Legacy/Compatibility Emitters ───────────────────────────────────────────

pub fn emit_split_created(env: &Env, split_id: u64, creator: &Address, total_amount: i128) {
    env.events()
        .publish((symbol_short!("created"),), (split_id, creator.clone(), total_amount));
}

pub fn emit_deposit_received(env: &Env, split_id: u64, participant: &Address, amount: i128) {
    env.events().publish(
        (symbol_short!("deposit"),),
        (split_id, participant.clone(), amount),
    );
}

pub fn emit_split_cancelled_legacy(env: &Env, split_id: u64) {
    env.events()
        .publish((symbol_short!("cancel"),), (split_id,));
}

// ── Rewards & Activity ──────────────────────────────────────────────────────

pub fn emit_activity_tracked(env: &Env, user: &Address, activity_type: &str, split_id: u64, amount: i128) {
    env.events()
        .publish(
            (Symbol::new(env, "activity_tracked"),),
            (user.clone(), activity_type, split_id, amount)
        );
}

pub fn emit_rewards_calculated(env: &Env, user: &Address, total_rewards: i128, available_rewards: i128) {
    env.events()
        .publish(
            (Symbol::new(env, "rewards_calculated"),),
            (user.clone(), total_rewards, available_rewards)
        );
}

pub fn emit_rewards_claimed(env: &Env, user: &Address, amount_claimed: i128) {
    env.events()
        .publish(
            (Symbol::new(env, "rewards_claimed"),),
            (user.clone(), amount_claimed)
        );
}

// ── Insurance & Verification ────────────────────────────────────────────────

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

pub fn emit_verification_submitted(env: &Env, verification_id: &String, split_id: &String, requester: &Address) {
    env.events()
        .publish(
            (Symbol::new(env, "verification_submitted"),),
            (verification_id.clone(), split_id.clone(), requester.clone())
        );
}

// ── Atomic Swap & Bridge ────────────────────────────────────────────────────

pub fn emit_swap_created(env: &Env, swap_id: &String, participant_a: &Address, participant_b: &Address, amount_a: i128, amount_b: i128) {
    env.events()
        .publish(
            (Symbol::new(env, "swap_created"),),
            (swap_id.clone(), participant_a.clone(), participant_b.clone(), amount_a, amount_b)
        );
}

pub fn emit_bridge_initiated(env: &Env, bridge_id: &String, source_chain: &String, destination_chain: &String, amount: i128, recipient: &String) {
    env.events()
        .publish(
            (Symbol::new(env, "bridge_initiated"),),
            (bridge_id.clone(), source_chain.clone(), destination_chain.clone(), amount, recipient.clone())
        );
}
